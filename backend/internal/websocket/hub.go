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
	h.mu.Unlock()

	log.Printf("[WebSocket] Acquisition started for session %s (Simulation: %v)", sessionID, isSim)
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

// startSimulationGenerator runs ONLY when explicitly acquiring in simulation mode
func (h *Hub) startSimulationGenerator() {
	ticker := time.NewTicker(40 * time.Millisecond) // 25 Hz packet transmission
	defer ticker.Stop()

	var t float64 = 0

	for range ticker.C {
		h.mu.RLock()
		active := h.isAcquiring && !h.isPaused && h.isSimulation
		clientCount := len(h.clients)
		sessionID := h.activeSessionID
		h.mu.RUnlock()

		// Never generate or broadcast simulated EEG data when standby/ready or no clients connected
		if !active || clientCount == 0 {
			continue
		}

		t += 0.04
		// Construct realistic rhythmic EEG: Alpha (10Hz) predominance + Theta (6Hz) + micro-noise
		signal := 22.0*math.Sin(2*math.Pi*10*t) + 14.0*math.Sin(2*math.Pi*6*t) + 8.0*math.Sin(2*math.Pi*2*t) + (rand.Float64()*4.0 - 2.0)
		signal = math.Round(signal*100) / 100

		packet := StreamPacket{
			Type:          "eeg_sample",
			SessionID:     sessionID,
			Timestamp:     time.Now().UnixMilli(),
			RawEEG:        signal,
			SignalQuality: 92 + rand.Intn(6),
			Delta:         16.0 + (rand.Float64()*4.0 - 2.0),
			Theta:         22.0 + (rand.Float64()*4.0 - 2.0),
			Alpha:         38.0 + (rand.Float64()*6.0 - 3.0),
			Beta:          17.0 + (rand.Float64()*3.0 - 1.5),
			Gamma:         6.0 + (rand.Float64()*2.0 - 1.0),
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
