package websocket

import (
	"encoding/json"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all frontend origins during development
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type StreamPacket struct {
	Type          string  `json:"type"`          // "eeg_sample" | "device_status" | "heartbeat" | "session_state"
	SessionID     string  `json:"sessionId,omitempty"`
	TargetBand    string  `json:"targetBand,omitempty"`  // Session immutable target band
	Timestamp     int64   `json:"timestamp"`     // Epoch ms
	RawEEG        float64 `json:"rawEEG"`        // Microvolts (uV)
	SignalQuality int     `json:"signalQuality"` // 0 - 100%
	Delta         float64 `json:"delta"`
	Theta         float64 `json:"theta"`
	Alpha         float64 `json:"alpha"`
	Beta          float64 `json:"beta"`
	Gamma         float64 `json:"gamma"`
	DeviceStatus  string  `json:"deviceStatus"`
	IsSimulation  bool    `json:"isSimulation"`
	State         string  `json:"state,omitempty"` // "READY" | "STARTING" | "ACQUIRING" | "PAUSED" | "STOPPING" | "COMPLETED"
}

type WSControlMessage struct {
	Action       string `json:"action"` // "start" | "pause" | "resume" | "stop" | "set_device"
	SessionID    string `json:"sessionId,omitempty"`
	TargetBand   string `json:"targetBand,omitempty"`
	DeviceID     string `json:"deviceId,omitempty"`
	DeviceName   string `json:"deviceName,omitempty"`
	DeviceCode   string `json:"deviceCode,omitempty"`
	IsSimulation bool   `json:"isSimulation,omitempty"`
}

type Hub struct {
	clients          map[*websocket.Conn]bool
	broadcast        chan []byte
	register         chan *websocket.Conn
	unregister       chan *websocket.Conn
	mu               sync.RWMutex
	isAcquiring      bool
	isPaused         bool
	isSimulation     bool
	activeSessionID  string
	activeTargetBand string
	simTime          float64
	sampleCounter    int64
	currentProfile   SimProfile
}

func NewHub() *Hub {
	h := &Hub{
		clients:          make(map[*websocket.Conn]bool),
		broadcast:        make(chan []byte, 256),
		register:         make(chan *websocket.Conn),
		unregister:       make(chan *websocket.Conn),
		isAcquiring:      false,
		isPaused:         false,
		isSimulation:     false,
		activeSessionID:  "",
		activeTargetBand: "ALPHA",
		simTime:          0.0,
		currentProfile:   simProfiles[0],
	}
	go h.run()
	go h.startSimulationGenerator()
	return h
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Println("[WebSocket] Client connected. Total active clients:", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
				log.Println("[WebSocket] Client disconnected. Total active clients:", len(h.clients))
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// StartAcquisition transitions stream to active state
func (h *Hub) StartAcquisition(sessionID string, isSim bool) {
	h.StartAcquisitionWithDeviceAndTarget(sessionID, isSim, "", "", "ALPHA")
}

// StartAcquisitionWithDevice transitions stream to active state with targeted device profile
func (h *Hub) StartAcquisitionWithDevice(sessionID string, isSim bool, deviceID string, deviceName string) {
	h.StartAcquisitionWithDeviceAndTarget(sessionID, isSim, deviceID, deviceName, "ALPHA")
}

// StartAcquisitionWithDeviceAndTarget transitions stream to active state with targeted device and immutable target band
func (h *Hub) StartAcquisitionWithDeviceAndTarget(sessionID string, isSim bool, deviceID string, deviceName string, targetBand string) {
	h.mu.Lock()
	h.isAcquiring = true
	h.isPaused = false
	h.isSimulation = isSim
	h.activeSessionID = sessionID
	if targetBand != "" {
		h.activeTargetBand = targetBand
	} else if h.activeTargetBand == "" {
		h.activeTargetBand = "ALPHA"
	}
	h.simTime = 0.0
	h.currentProfile = getProfileForDevice(deviceID, deviceName, sessionID)
	profileName := h.currentProfile.Name
	dominantBand := h.currentProfile.DominantBand
	h.mu.Unlock()

	log.Printf("[SESSION] status: ACQUIRING session_id: %s target_band: %s device: %s %s", sessionID, h.activeTargetBand, deviceID, deviceName)
	log.Printf("[SIMULATION] enabled: %v, session_id: %s, profile: %s, dominant: %s", isSim, sessionID, profileName, dominantBand)
	h.BroadcastState("ACQUIRING", sessionID)
}

// SetDevice dynamically switches the simulation profile to match the selected target device
func (h *Hub) SetDevice(deviceID string, deviceName string) {
	h.mu.Lock()
	if h.isAcquiring {
		// Session is actively acquiring: device and target are immutable
		h.mu.Unlock()
		log.Printf("[DEVICE] Ignored set_device during active acquisition for session %s", h.activeSessionID)
		return
	}
	h.currentProfile = getProfileForDevice(deviceID, deviceName, h.activeSessionID)
	profileName := h.currentProfile.Name
	dominantBand := h.currentProfile.DominantBand
	h.mu.Unlock()

	log.Printf("[DEVICE] switched target device: %s %s -> profile: %s (%s dominant)", deviceID, deviceName, profileName, dominantBand)
}

// PauseAcquisition pauses data streaming without terminating session
func (h *Hub) PauseAcquisition() {
	h.mu.Lock()
	if h.isAcquiring {
		h.isPaused = true
	}
	sessionID := h.activeSessionID
	h.mu.Unlock()

	log.Println("[WebSocket] Acquisition paused")
	h.BroadcastState("PAUSED", sessionID)
}

// ResumeAcquisition resumes stream
func (h *Hub) ResumeAcquisition() {
	h.mu.Lock()
	if h.isAcquiring {
		h.isPaused = false
	}
	sessionID := h.activeSessionID
	h.mu.Unlock()

	log.Println("[WebSocket] Acquisition resumed")
	h.BroadcastState("ACQUIRING", sessionID)
}

// StopAcquisition stops streaming and marks session completed
func (h *Hub) StopAcquisition() {
	h.mu.Lock()
	sessionID := h.activeSessionID
	h.isAcquiring = false
	h.isPaused = false
	h.isSimulation = false
	h.activeSessionID = ""
	h.mu.Unlock()

	log.Println("[WebSocket] Acquisition stopped")
	h.BroadcastState("COMPLETED", sessionID)
}

// GetActiveSessionID returns currently active session ID thread-safely
func (h *Hub) GetActiveSessionID() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.activeSessionID
}

// BroadcastState sends session state update to all clients
func (h *Hub) BroadcastState(state string, sessionID string) {
	h.mu.RLock()
	targetBand := h.activeTargetBand
	isSim := h.isSimulation
	h.mu.RUnlock()

	packet := StreamPacket{
		Type:         "session_state",
		SessionID:    sessionID,
		TargetBand:   targetBand,
		Timestamp:    time.Now().UnixMilli(),
		State:        state,
		DeviceStatus: "connected",
		IsSimulation: isSim,
	}
	bytes, err := json.Marshal(packet)
	if err == nil {
		h.broadcast <- bytes
	}
}

// BroadcastSample broadcasts real hardware or ingested EEG sample
func (h *Hub) BroadcastSample(packet StreamPacket) {
	h.mu.RLock()
	active := h.isAcquiring && !h.isPaused
	h.mu.RUnlock()

	if !active {
		return
	}

	bytes, err := json.Marshal(packet)
	if err == nil {
		h.broadcast <- bytes
	}
}

type SimProfile struct {
	Name            string
	DominantBand    string
	BaseDelta       float64
	BaseTheta       float64
	BaseAlpha       float64
	BaseBeta        float64
	BaseGamma       float64
	WaveFreq        float64 // Principal oscillation frequency in Hz
	CyclesPerBuffer float64 // Visual cycles across 120-sample buffer
	PrimaryAmp      float64 // µV
}

var simProfiles = []SimProfile{
	{
		Name:            "Relaxed Alertness (Alpha Dominant)",
		DominantBand:    "Alpha",
		BaseDelta:       10.5,
		BaseTheta:       15.0,
		BaseAlpha:       48.0, // Alpha ~48% DOMINANT
		BaseBeta:        18.0,
		BaseGamma:       8.5,
		WaveFreq:        10.0,
		CyclesPerBuffer: 17.0, // 17 smooth cycles with spindle envelope
		PrimaryAmp:      22.0,
	},
	{
		Name:            "Active Cognitive Focus (Beta Dominant)",
		DominantBand:    "Beta",
		BaseDelta:       9.5,
		BaseTheta:       13.5,
		BaseAlpha:       19.0,
		BaseBeta:        45.0, // Beta ~45% DOMINANT
		BaseGamma:       13.0,
		WaveFreq:        22.0,
		CyclesPerBuffer: 32.0, // 32 fast desynchronized cycles
		PrimaryAmp:      14.0,
	},
	{
		Name:            "High Cognitive Workload (Gamma Dominant)",
		DominantBand:    "Gamma",
		BaseDelta:       8.0,
		BaseTheta:       11.0,
		BaseAlpha:       15.0,
		BaseBeta:        26.0,
		BaseGamma:       40.0, // Gamma ~40% DOMINANT
		WaveFreq:        40.0,
		CyclesPerBuffer: 48.0, // 48 rapid micro-ripples
		PrimaryAmp:      8.5,
	},
	{
		Name:            "Deep Restful State (Delta Dominant)",
		DominantBand:    "Delta",
		BaseDelta:       52.0, // Delta ~52% DOMINANT
		BaseTheta:       20.0,
		BaseAlpha:       13.0,
		BaseBeta:        9.5,
		BaseGamma:       5.5,
		WaveFreq:        2.0,
		CyclesPerBuffer: 3.2, // 3.2 large slow rolling waves
		PrimaryAmp:      38.0,
	},
	{
		Name:            "Drowsy / Meditative State (Theta Dominant)",
		DominantBand:    "Theta",
		BaseDelta:       17.0,
		BaseTheta:       47.0, // Theta ~47% DOMINANT
		BaseAlpha:       17.5,
		BaseBeta:        12.0,
		BaseGamma:       6.5,
		WaveFreq:        6.0,
		CyclesPerBuffer: 7.5, // 7.5 rhythmic rolling waves
		PrimaryAmp:      26.0,
	},
}

func getSessionProfile(sessionID string) SimProfile {
	if sessionID == "" {
		return simProfiles[0] // Default Alpha
	}
	var hash uint32 = 2166136261
	for i := 0; i < len(sessionID); i++ {
		hash ^= uint32(sessionID[i])
		hash *= 16777619
	}
	idx := int(hash % uint32(len(simProfiles)))
	return simProfiles[idx]
}

func getProfileForDevice(deviceID, deviceName, sessionID string) SimProfile {
	s := strings.ToLower(deviceID + " " + deviceName)
	if strings.Contains(s, "delta") || strings.Contains(s, "004") {
		return simProfiles[3] // Delta
	}
	if strings.Contains(s, "theta") || strings.Contains(s, "005") {
		return simProfiles[4] // Theta
	}
	if strings.Contains(s, "gamma") || strings.Contains(s, "003") {
		return simProfiles[2] // Gamma
	}
	if strings.Contains(s, "beta") || strings.Contains(s, "002") {
		return simProfiles[1] // Beta
	}
	if strings.Contains(s, "alpha") || strings.Contains(s, "alfa") || strings.Contains(s, "001") {
		return simProfiles[0] // Alpha
	}
	if sessionID != "" {
		return getSessionProfile(sessionID)
	}
	return simProfiles[0]
}

// startSimulationGenerator runs ONLY when explicitly acquiring in simulation mode
func (h *Hub) startSimulationGenerator() {
	ticker := time.NewTicker(40 * time.Millisecond) // 25 Hz packet transmission
	defer ticker.Stop()

	for range ticker.C {
		h.mu.Lock()
		active := h.isAcquiring && !h.isPaused && h.isSimulation
		clientCount := len(h.clients)
		sessionID := h.activeSessionID
		targetBand := h.activeTargetBand
		profile := h.currentProfile
		h.simTime += 0.04
		t := h.simTime
		h.sampleCounter++
		sampleIdx := h.sampleCounter
		h.mu.Unlock()

		// Never generate or broadcast simulated EEG data when standby/ready or no clients connected
		if !active || clientCount == 0 {
			continue
		}

		// Gentle biological micro-fluctuations (±1.5%) around profile baselines
		d := math.Max(1.0, profile.BaseDelta+1.5*math.Sin(t*0.35+0.5)+(rand.Float64()*1.0-0.5))
		th := math.Max(1.0, profile.BaseTheta+1.5*math.Sin(t*0.45+1.2)+(rand.Float64()*1.0-0.5))
		a := math.Max(1.0, profile.BaseAlpha+2.0*math.Sin(t*0.55+2.1)+(rand.Float64()*1.0-0.5))
		b := math.Max(1.0, profile.BaseBeta+1.8*math.Sin(t*0.65+3.4)+(rand.Float64()*1.0-0.5))
		g := math.Max(1.0, profile.BaseGamma+1.2*math.Sin(t*0.85+4.3)+(rand.Float64()*0.8-0.4))

		// Relative spectral power percentage (sum to 100%)
		sum := d + th + a + b + g
		relDelta := math.Round((d/sum)*1000) / 10
		relTheta := math.Round((th/sum)*1000) / 10
		relAlpha := math.Round((a/sum)*1000) / 10
		relBeta := math.Round((b/sum)*1000) / 10
		relGamma := math.Round((g/sum)*1000) / 10

		// True physiological waveform synthesis without aliasing
		k := profile.CyclesPerBuffer
		if k <= 0 {
			k = 17.0
		}
		phase := (float64(sampleIdx) * 2.0 * math.Pi * k) / 120.0

		var signal float64
		switch profile.DominantBand {
		case "Delta":
			signal = 36.0*math.Sin(phase) + 6.0*math.Sin(phase*0.45+0.8)
		case "Theta":
			signal = 24.0*math.Sin(phase) + 5.0*math.Sin(phase*0.5+1.2)
		case "Alpha":
			env := 18.0 + 5.0*math.Cos((float64(sampleIdx)*2.0*math.Pi*1.5)/120.0)
			signal = env*math.Sin(phase) + 2.0*math.Sin(phase*2.0+0.4)
		case "Beta":
			signal = 12.0*math.Sin(phase) + 3.5*math.Sin(phase*0.7+0.9) + 2.0*math.Sin(phase*1.4+2.1)
		case "Gamma":
			signal = 6.5*math.Sin(phase) + 2.5*math.Sin(phase*1.35+0.4)
		default:
			signal = 18.0 * math.Sin(phase)
		}
		signal += (rand.Float64()*2.0 - 1.0) * 1.0
		signal = math.Round(signal*100) / 100

		packet := StreamPacket{
			Type:          "eeg_sample",
			SessionID:     sessionID,
			TargetBand:    targetBand,
			Timestamp:     time.Now().UnixMilli(),
			RawEEG:        signal,
			SignalQuality: 92 + rand.Intn(7),
			Delta:         relDelta,
			Theta:         relTheta,
			Alpha:         relAlpha,
			Beta:          relBeta,
			Gamma:         relGamma,
			DeviceStatus:  "connected",
			IsSimulation:  true,
		}

		bytes, err := json.Marshal(packet)
		if err == nil {
			h.broadcast <- bytes
		}
	}
}

func (h *Hub) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WebSocket] Upgrade error: %v", err)
		return
	}

	h.register <- conn

	// Reader pump to handle client control messages and detect disconnects
	go func() {
		defer func() {
			h.unregister <- conn
		}()
		for {
			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				break
			}

			var ctrl WSControlMessage
			if err := json.Unmarshal(msgBytes, &ctrl); err == nil {
				switch ctrl.Action {
				case "start":
					h.StartAcquisitionWithDeviceAndTarget(ctrl.SessionID, ctrl.IsSimulation, ctrl.DeviceID, ctrl.DeviceName, ctrl.TargetBand)
				case "set_device":
					h.SetDevice(ctrl.DeviceID, ctrl.DeviceName)
				case "pause":
					h.PauseAcquisition()
				case "resume":
					h.ResumeAcquisition()
				case "stop":
					h.StopAcquisition()
				}
			}
		}
	}()
}
