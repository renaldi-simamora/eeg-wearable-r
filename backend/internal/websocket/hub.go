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
	Type          string  `json:"type"`          // "eeg_sample" | "device_status" | "heartbeat"
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
}

type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

func NewHub() *Hub {
	h := &Hub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
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

// startSimulationGenerator generates realistic 50Hz EEG waveform simulation
// for connected clients when no hardware ESP32 is feeding data
func (h *Hub) startSimulationGenerator() {
	ticker := time.NewTicker(40 * time.Millisecond) // 25 Hz packets
	defer ticker.Stop()

	var t float64 = 0

	for range ticker.C {
		h.mu.Lock()
		clientCount := len(h.clients)
		h.mu.Unlock()

		if clientCount == 0 {
			continue
		}

		t += 0.04
		// Construct realistic rhythmic EEG with Alpha (10Hz) predominance + Theta (6Hz) + micro-noise
		signal := 22.0*math.Sin(2*math.Pi*10*t) + 14.0*math.Sin(2*math.Pi*6*t) + 8.0*math.Sin(2*math.Pi*2*t) + (rand.Float64()*4.0 - 2.0)
		signal = math.Round(signal*100) / 100

		packet := StreamPacket{
			Type:          "eeg_sample",
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

	// Reader pump to detect disconnects
	go func() {
		defer func() {
			h.unregister <- conn
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}
