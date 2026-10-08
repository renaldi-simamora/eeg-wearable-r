package websocket

import (
	"encoding/json"
	"log"
	"math"
	"math/rand"
	"net/http"
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
	Action       string `json:"action"` // "start" | "pause" | "resume" | "stop" | "status"
	SessionID    string `json:"sessionId,omitempty"`
	IsSimulation bool   `json:"isSimulation,omitempty"`
}

type Hub struct {
	clients         map[*websocket.Conn]bool
	broadcast       chan []byte
	register        chan *websocket.Conn
	unregister      chan *websocket.Conn
	mu              sync.RWMutex
	isAcquiring     bool
	isPaused        bool
	isSimulation    bool
	activeSessionID string
	simTime         float64
	currentProfile  SimProfile
}

func NewHub() *Hub {
	h := &Hub{
		clients:         make(map[*websocket.Conn]bool),
		broadcast:       make(chan []byte, 256),
		register:        make(chan *websocket.Conn),
		unregister:      make(chan *websocket.Conn),
		isAcquiring:     false,
		isPaused:        false,
		isSimulation:    false,
		activeSessionID: "",
		simTime:         0.0,
		currentProfile:  simProfiles[0],
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
	h.mu.Lock()
	h.isAcquiring = true
	h.isPaused = false
	h.isSimulation = isSim
	h.activeSessionID = sessionID
	h.simTime = 0.0
	h.currentProfile = getSessionProfile(sessionID)
	profileName := h.currentProfile.Name
	dominantBand := h.currentProfile.DominantBand
	h.mu.Unlock()

	log.Printf("[SESSION] status: ACQUIRING session_id: %s", sessionID)
	log.Printf("[SIMULATION] enabled: %v, session_id: %s, profile: %s, dominant: %s", isSim, sessionID, profileName, dominantBand)
	h.BroadcastState("ACQUIRING", sessionID)
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
	packet := StreamPacket{
		Type:         "session_state",
		SessionID:    sessionID,
		Timestamp:    time.Now().UnixMilli(),
		State:        state,
		DeviceStatus: "connected",
		IsSimulation: h.isSimulation,
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
	Name         string
	DominantBand string
	BaseDelta    float64
	BaseTheta    float64
	BaseAlpha    float64
	BaseBeta     float64
	BaseGamma    float64
	WaveFreq     float64 // Principal oscillation frequency in Hz
}

var simProfiles = []SimProfile{
	{
		Name:         "Active Cognitive Focus (Beta Dominant)",
		DominantBand: "Beta",
		BaseDelta:    11.0,
		BaseTheta:    15.0,
		BaseAlpha:    21.0,
		BaseBeta:     39.0, // Beta ~39%
		BaseGamma:    14.0,
		WaveFreq:     20.0,
	},
	{
		Name:         "Relaxed Alertness (Alpha Dominant)",
		DominantBand: "Alpha",
		BaseDelta:    13.0,
		BaseTheta:    17.0,
		BaseAlpha:    43.0, // Alpha ~43%
		BaseBeta:     19.0,
		BaseGamma:    8.0,
		WaveFreq:     10.0,
	},
	{
		Name:         "Drowsy / Meditative State (Theta Dominant)",
		DominantBand: "Theta",
		BaseDelta:    22.0,
		BaseTheta:    42.0, // Theta ~42%
		BaseAlpha:    19.0,
		BaseBeta:     12.0,
		BaseGamma:    5.0,
		WaveFreq:     6.0,
	},
	{
		Name:         "Deep Restful State (Delta Dominant)",
		DominantBand: "Delta",
		BaseDelta:    44.0, // Delta ~44%
		BaseTheta:    24.0,
		BaseAlpha:    15.0,
		BaseBeta:     11.0,
		BaseGamma:    6.0,
		WaveFreq:     2.5,
	},
	{
		Name:         "High Cognitive Workload (Gamma/Beta Elevated)",
		DominantBand: "Gamma",
		BaseDelta:    9.0,
		BaseTheta:    13.0,
		BaseAlpha:    18.0,
		BaseBeta:     29.0,
		BaseGamma:    31.0, // Gamma ~31%
		WaveFreq:     36.0,
	},
}

func getSessionProfile(sessionID string) SimProfile {
	if sessionID == "" {
		return simProfiles[rand.Intn(len(simProfiles))]
	}
	var hash uint32 = 2166136261
	for i := 0; i < len(sessionID); i++ {
		hash ^= uint32(sessionID[i])
		hash *= 16777619
	}
	idx := int(hash % uint32(len(simProfiles)))
	return simProfiles[idx]
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
		profile := h.currentProfile
		h.simTime += 0.04
		t := h.simTime
		h.mu.Unlock()

		// Never generate or broadcast simulated EEG data when standby/ready or no clients connected
		if !active || clientCount == 0 {
			continue
		}

		// Biologically realistic temporal oscillations around the selected session profile
		d := math.Max(1.0, profile.BaseDelta+4.0*math.Sin(t*0.35+0.5)+(rand.Float64()*2.0-1.0))
		th := math.Max(1.0, profile.BaseTheta+4.0*math.Sin(t*0.45+1.2)+(rand.Float64()*2.0-1.0))
		a := math.Max(1.0, profile.BaseAlpha+5.0*math.Sin(t*0.55+2.1)+(rand.Float64()*2.5-1.25))
		b := math.Max(1.0, profile.BaseBeta+4.5*math.Sin(t*0.65+3.4)+(rand.Float64()*2.0-1.0))
		g := math.Max(1.0, profile.BaseGamma+3.0*math.Sin(t*0.85+4.3)+(rand.Float64()*1.5-0.75))

		// Relative spectral power percentage (sum to 100%)
		sum := d + th + a + b + g
		relDelta := math.Round((d/sum)*1000) / 10
		relTheta := math.Round((th/sum)*1000) / 10
		relAlpha := math.Round((a/sum)*1000) / 10
		relBeta := math.Round((b/sum)*1000) / 10
		relGamma := math.Round((g/sum)*1000) / 10

		// Realistic raw EEG voltage waveform trace reflecting the profile's principal oscillation
		signal := 22.0*math.Sin(2*math.Pi*profile.WaveFreq*t) +
			10.0*math.Sin(2*math.Pi*(profile.WaveFreq*0.5)*t) +
			5.0*math.Sin(2*math.Pi*2.0*t) +
			(rand.Float64()*3.0 - 1.5)
		signal = math.Round(signal*100) / 100

		packet := StreamPacket{
			Type:          "eeg_sample",
			SessionID:     sessionID,
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
					h.StartAcquisition(ctrl.SessionID, ctrl.IsSimulation)
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
