package database

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"math/rand"
	"time"

	"eeg-backend/models"

	_ "github.com/lib/pq"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(dbURL string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) RunMigrations(migrationSQL string) error {
	_, err := s.db.Exec(migrationSQL)
	return err
}

func (s *PostgresStore) CreateUser(user *models.User) error {
	query := `
		INSERT INTO users (id, name, email, password_hash, role, institution, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := s.db.Exec(query, user.ID, user.Name, user.Email, user.PasswordHash, user.Role, user.Institution, user.CreatedAt, user.UpdatedAt)
	return err
}

func (s *PostgresStore) GetUserByEmail(email string) (*models.User, error) {
	query := `SELECT id, name, email, password_hash, role, institution, created_at, updated_at FROM users WHERE email = $1`
	row := s.db.QueryRow(query, email)

	var u models.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Institution, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) GetUserByID(id string) (*models.User, error) {
	query := `SELECT id, name, email, password_hash, role, institution, created_at, updated_at FROM users WHERE id = $1`
	row := s.db.QueryRow(query, id)

	var u models.User
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Institution, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) UpdateUser(user *models.User) error {
	query := `UPDATE users SET name = $1, institution = $2, updated_at = $3 WHERE id = $4`
	_, err := s.db.Exec(query, user.Name, user.Institution, time.Now(), user.ID)
	return err
}

func (s *PostgresStore) GetDevices() ([]models.Device, error) {
	query := `SELECT id, device_code, name, status, battery_level, signal_quality, firmware_version, last_seen, created_at, updated_at FROM devices ORDER BY name ASC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []models.Device
	for rows.Next() {
		var d models.Device
		if err := rows.Scan(&d.ID, &d.DeviceCode, &d.Name, &d.Status, &d.BatteryLevel, &d.SignalQuality, &d.FirmwareVersion, &d.LastSeen, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return devices, nil
}

func (s *PostgresStore) GetDeviceByID(id string) (*models.Device, error) {
	query := `SELECT id, device_code, name, status, battery_level, signal_quality, firmware_version, last_seen, created_at, updated_at FROM devices WHERE id = $1`
	row := s.db.QueryRow(query, id)

	var d models.Device
	if err := row.Scan(&d.ID, &d.DeviceCode, &d.Name, &d.Status, &d.BatteryLevel, &d.SignalQuality, &d.FirmwareVersion, &d.LastSeen, &d.CreatedAt, &d.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

func (s *PostgresStore) CreateDevice(device *models.Device) error {
	query := `
		INSERT INTO devices (id, device_code, name, status, battery_level, signal_quality, firmware_version, last_seen, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := s.db.Exec(query, device.ID, device.DeviceCode, device.Name, device.Status, device.BatteryLevel, device.SignalQuality, device.FirmwareVersion, device.LastSeen, device.CreatedAt, device.UpdatedAt)
	return err
}

func (s *PostgresStore) UpdateDevice(device *models.Device) error {
	query := `
		UPDATE devices 
		SET name = $1, status = $2, battery_level = $3, signal_quality = $4, updated_at = $5, last_seen = $6
		WHERE id = $7
	`
	_, err := s.db.Exec(query, device.Name, device.Status, device.BatteryLevel, device.SignalQuality, time.Now(), device.LastSeen, device.ID)
	return err
}

func (s *PostgresStore) DeleteDevice(id string) error {
	query := `DELETE FROM devices WHERE id = $1`
	_, err := s.db.Exec(query, id)
	return err
}

func (s *PostgresStore) GetSessions(userID string) ([]models.Session, error) {
	var query string
	var rows *sql.Rows
	var err error

	if userID != "" {
		query = `
			SELECT s.id, s.user_id, s.device_id, s.started_at, s.ended_at, s.duration, s.status, s.created_at,
			       d.name, d.device_code, d.signal_quality
			FROM sessions s
			LEFT JOIN devices d ON s.device_id = d.id
			WHERE s.user_id = $1
			ORDER BY s.started_at DESC
		`
		rows, err = s.db.Query(query, userID)
	} else {
		query = `
			SELECT s.id, s.user_id, s.device_id, s.started_at, s.ended_at, s.duration, s.status, s.created_at,
			       d.name, d.device_code, d.signal_quality
			FROM sessions s
			LEFT JOIN devices d ON s.device_id = d.id
			ORDER BY s.started_at DESC
		`
		rows, err = s.db.Query(query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []models.Session
	for rows.Next() {
		var s models.Session
		var endedAt sql.NullTime
		var devName, devCode sql.NullString
		var sigQuality sql.NullInt32

		if err := rows.Scan(&s.ID, &s.UserID, &s.DeviceID, &s.StartedAt, &endedAt, &s.Duration, &s.Status, &s.CreatedAt, &devName, &devCode, &sigQuality); err != nil {
			return nil, err
		}
		if endedAt.Valid {
			s.EndedAt = &endedAt.Time
		}
		if devName.Valid {
			s.DeviceName = devName.String
		}
		if devCode.Valid {
			s.DeviceCode = devCode.String
		}
		if sigQuality.Valid {
			s.SignalQuality = int(sigQuality.Int32)
		}
		sessions = append(sessions, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (s *PostgresStore) GetSessionByID(id string) (*models.Session, error) {
	query := `
		SELECT s.id, s.user_id, s.device_id, s.started_at, s.ended_at, s.duration, s.status, s.created_at,
		       d.name, d.device_code, d.signal_quality
		FROM sessions s
		LEFT JOIN devices d ON s.device_id = d.id
		WHERE s.id = $1
	`
	row := s.db.QueryRow(query, id)

	var ses models.Session
	var endedAt sql.NullTime
	var devName, devCode sql.NullString
	var sigQuality sql.NullInt32

	if err := row.Scan(&ses.ID, &ses.UserID, &ses.DeviceID, &ses.StartedAt, &endedAt, &ses.Duration, &ses.Status, &ses.CreatedAt, &devName, &devCode, &sigQuality); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if endedAt.Valid {
		ses.EndedAt = &endedAt.Time
	}
	if devName.Valid {
		ses.DeviceName = devName.String
	}
	if devCode.Valid {
		ses.DeviceCode = devCode.String
	}
	if sigQuality.Valid {
		ses.SignalQuality = int(sigQuality.Int32)
	}
	return &ses, nil
}

func (s *PostgresStore) CreateSession(session *models.Session) error {
	query := `
		INSERT INTO sessions (id, user_id, device_id, started_at, duration, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := s.db.Exec(query, session.ID, session.UserID, session.DeviceID, session.StartedAt, session.Duration, session.Status, session.CreatedAt)
	return err
}

func (s *PostgresStore) StopSession(id string) (*models.Session, error) {
	now := time.Now()
	ses, err := s.GetSessionByID(id)
	if err != nil {
		return nil, err
	}
	if ses == nil {
		return nil, fmt.Errorf("session not found")
	}

	duration := int(now.Sub(ses.StartedAt).Seconds())
	if duration < 0 {
		duration = 0
	}

	query := `
		UPDATE sessions
		SET ended_at = $1, duration = $2, status = 'completed'
		WHERE id = $3
	`
	_, err = s.db.Exec(query, now, duration, id)
	if err != nil {
		return nil, err
	}

	ses.EndedAt = &now
	ses.Duration = duration
	ses.Status = "completed"
	return ses, nil
}

func (s *PostgresStore) SaveEEGSamples(samples []models.EEGSample) error {
	if len(samples) == 0 {
		return nil
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`INSERT INTO eeg_samples (id, session_id, timestamp, raw_eeg, signal_quality, created_at) VALUES ($1, $2, $3, $4, $5, $6)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, sample := range samples {
		_, err := stmt.Exec(sample.ID, sample.SessionID, sample.Timestamp, sample.RawEEG, sample.SignalQuality, sample.CreatedAt)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *PostgresStore) GetEEGSamples(sessionID string) ([]models.EEGSample, error) {
	query := `SELECT id, session_id, timestamp, raw_eeg, signal_quality, created_at FROM eeg_samples WHERE session_id = $1 ORDER BY timestamp ASC LIMIT 500`
	rows, err := s.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var samples []models.EEGSample
	for rows.Next() {
		var sm models.EEGSample
		if err := rows.Scan(&sm.ID, &sm.SessionID, &sm.Timestamp, &sm.RawEEG, &sm.SignalQuality, &sm.CreatedAt); err != nil {
			return nil, err
		}
		samples = append(samples, sm)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return samples, nil
}

func (s *PostgresStore) SaveBrainwaveFeature(feature *models.BrainwaveFeature) error {
	query := `
		INSERT INTO brainwave_features (id, session_id, timestamp, delta, theta, alpha, beta, gamma, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := s.db.Exec(query, feature.ID, feature.SessionID, feature.Timestamp, feature.Delta, feature.Theta, feature.Alpha, feature.Beta, feature.Gamma, feature.CreatedAt)
	return err
}

func (s *PostgresStore) GetBrainwaveFeatures(sessionID string) ([]models.BrainwaveFeature, error) {
	query := `SELECT id, session_id, timestamp, delta, theta, alpha, beta, gamma, created_at FROM brainwave_features WHERE session_id = $1 ORDER BY timestamp ASC`
	rows, err := s.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var features []models.BrainwaveFeature
	for rows.Next() {
		var bf models.BrainwaveFeature
		if err := rows.Scan(&bf.ID, &bf.SessionID, &bf.Timestamp, &bf.Delta, &bf.Theta, &bf.Alpha, &bf.Beta, &bf.Gamma, &bf.CreatedAt); err != nil {
			return nil, err
		}
		features = append(features, bf)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return features, nil
}

func (s *PostgresStore) GetMLPredictions(sessionID string) ([]models.MLPrediction, error) {
	query := `SELECT id, session_id, timestamp, model_name, model_version, predicted_class, confidence, created_at FROM ml_predictions WHERE session_id = $1 ORDER BY timestamp ASC`
	rows, err := s.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var predictions []models.MLPrediction
	for rows.Next() {
		var ml models.MLPrediction
		if err := rows.Scan(&ml.ID, &ml.SessionID, &ml.Timestamp, &ml.ModelName, &ml.ModelVersion, &ml.PredictedClass, &ml.Confidence, &ml.CreatedAt); err != nil {
			return nil, err
		}
		predictions = append(predictions, ml)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return predictions, nil
}

func (s *PostgresStore) GetAIInsights(sessionID string) ([]models.AIInsight, error) {
	query := `SELECT id, session_id, title, summary, created_at FROM ai_insights WHERE session_id = $1 ORDER BY created_at DESC`
	rows, err := s.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var insights []models.AIInsight
	for rows.Next() {
		var ai models.AIInsight
		if err := rows.Scan(&ai.ID, &ai.SessionID, &ai.Title, &ai.Summary, &ai.CreatedAt); err != nil {
			return nil, err
		}
		insights = append(insights, ai)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return insights, nil
}

func (s *PostgresStore) SaveMLPrediction(pred *models.MLPrediction) error {
	query := `
		INSERT INTO ml_predictions (id, session_id, timestamp, model_name, model_version, predicted_class, confidence, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := s.db.Exec(query, pred.ID, pred.SessionID, pred.Timestamp, pred.ModelName, pred.ModelVersion, pred.PredictedClass, pred.Confidence, pred.CreatedAt)
	return err
}

func (s *PostgresStore) SaveAIInsight(insight *models.AIInsight) error {
	query := `
		INSERT INTO ai_insights (id, session_id, title, summary, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := s.db.Exec(query, insight.ID, insight.SessionID, insight.Title, insight.Summary, insight.CreatedAt)
	return err
}

// SeedInitialData creates standard starter records if tables are empty
func (s *PostgresStore) SeedInitialData() {
	// Ensure default admin user (admin@gmail.com / admin123) is always available
	const adminHash = "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li"
	_, _ = s.db.Exec("UPDATE users SET email = 'admin@gmail.com', password_hash = $1 WHERE email IN ('researcher@biomedical.ac.id', 'demo@research.eeg')", adminHash)

	var existingUserId string
	err := s.db.QueryRow("SELECT id FROM users WHERE email = 'admin@gmail.com'").Scan(&existingUserId)
	if err == nil {
		_, _ = s.db.Exec("UPDATE users SET password_hash = $1, role = 'researcher' WHERE email = 'admin@gmail.com'", adminHash)
	} else {
		adminId := "user-demo-01"
		var idTaken bool
		_ = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", adminId).Scan(&idTaken)
		if idTaken {
			adminId = "user-admin-01"
		}
		_ = s.CreateUser(&models.User{
			ID:           adminId,
			Name:         "Admin Researcher",
			Email:        "admin@gmail.com",
			PasswordHash: adminHash,
			Role:         "researcher",
			Institution:  "Biomedical Engineering Laboratory",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		})
	}

	var count int
	_ = s.db.QueryRow("SELECT COUNT(*) FROM devices").Scan(&count)
	if count < 5 {
		log.Println("[Postgres] Seeding initial devices...")
		initialDevices := []models.Device{
			{
				ID:              "dev-001",
				DeviceCode:      "EEG-001",
				Name:            "TGAM1 Wearable Headset Alpha",
				Status:          "connected",
				BatteryLevel:    88,
				SignalQuality:   94,
				FirmwareVersion: "v1.2.0-esp32",
				LastSeen:        time.Now(),
				CreatedAt:       time.Now().Add(-72 * time.Hour),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              "dev-002",
				DeviceCode:      "EEG-002",
				Name:            "TGAM1 Wearable Headset Beta",
				Status:          "disconnected",
				BatteryLevel:    62,
				SignalQuality:   0,
				FirmwareVersion: "v1.1.4-esp32",
				LastSeen:        time.Now().Add(-5 * time.Hour),
				CreatedAt:       time.Now().Add(-120 * time.Hour),
				UpdatedAt:       time.Now().Add(-5 * time.Hour),
			},
			{
				ID:              "dev-003",
				DeviceCode:      "EEG-003",
				Name:            "TGAM1 Wearable Headset Gamma",
				Status:          "warning",
				BatteryLevel:    18,
				SignalQuality:   42,
				FirmwareVersion: "v1.2.0-esp32",
				LastSeen:        time.Now().Add(-12 * time.Minute),
				CreatedAt:       time.Now().Add(-48 * time.Hour),
				UpdatedAt:       time.Now().Add(-12 * time.Minute),
			},
			{
				ID:              "dev-004",
				DeviceCode:      "EEG-004",
				Name:            "TGAM1 Wearable Headset Delta",
				Status:          "connected",
				BatteryLevel:    91,
				SignalQuality:   96,
				FirmwareVersion: "v1.2.4-esp32",
				LastSeen:        time.Now(),
				CreatedAt:       time.Now().Add(-72 * time.Hour),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              "dev-005",
				DeviceCode:      "EEG-005",
				Name:            "TGAM1 Wearable Headset Theta",
				Status:          "connected",
				BatteryLevel:    78,
				SignalQuality:   92,
				FirmwareVersion: "v1.2.4-esp32",
				LastSeen:        time.Now(),
				CreatedAt:       time.Now().Add(-48 * time.Hour),
				UpdatedAt:       time.Now(),
			},
		}
		for _, dev := range initialDevices {
			_ = s.CreateDevice(&dev)
		}
	}

	var sessionCount int
	_ = s.db.QueryRow("SELECT COUNT(*) FROM sessions WHERE id IN ('ses-001', 'ses-002', 'ses-003', 'ses-004', 'ses-005')").Scan(&sessionCount)
	if sessionCount < 5 {
		log.Println("[Postgres] Seeding initial research sessions & EEG data across 5 brainwave protocols...")
		now := time.Now()
		s1Ended := now.Add(-30 * time.Minute)
		s2Ended := now.Add(-120 * time.Minute)
		s3Ended := now.Add(-240 * time.Minute)
		s4Ended := now.Add(-360 * time.Minute)
		s5Ended := now.Add(-480 * time.Minute)

		// Ensure user-demo-01 exists to satisfy foreign key constraint and provide default admin login
		_ = s.CreateUser(&models.User{
			ID:           "user-demo-01",
			Name:         "Admin Researcher",
			Email:        "admin@gmail.com",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "researcher",
			Institution:  "Biomedical Engineering Laboratory",
			CreatedAt:    now.Add(-72 * time.Hour),
			UpdatedAt:    now,
		})

		initialSessions := []models.Session{
			{
				ID:            "ses-001",
				UserID:        "user-demo-01",
				DeviceID:      "dev-001",
				StartedAt:     now.Add(-45 * time.Minute),
				EndedAt:       &s1Ended,
				Duration:      900,
				Status:        "completed",
				CreatedAt:     now.Add(-45 * time.Minute),
				DeviceName:    "TGAM1 Wearable Headset Alpha",
				DeviceCode:    "EEG-001",
				SignalQuality: 94,
			},
			{
				ID:            "ses-002",
				UserID:        "user-demo-01",
				DeviceID:      "dev-002",
				StartedAt:     now.Add(-140 * time.Minute),
				EndedAt:       &s2Ended,
				Duration:      1200,
				Status:        "completed",
				CreatedAt:     now.Add(-140 * time.Minute),
				DeviceName:    "TGAM1 Wearable Headset Beta",
				DeviceCode:    "EEG-002",
				SignalQuality: 91,
			},
			{
				ID:            "ses-003",
				UserID:        "user-demo-01",
				DeviceID:      "dev-003",
				StartedAt:     now.Add(-252 * time.Minute),
				EndedAt:       &s3Ended,
				Duration:      720,
				Status:        "completed",
				CreatedAt:     now.Add(-252 * time.Minute),
				DeviceName:    "TGAM1 Wearable Headset Gamma",
				DeviceCode:    "EEG-003",
				SignalQuality: 89,
			},
			{
				ID:            "ses-004",
				UserID:        "user-demo-01",
				DeviceID:      "dev-004",
				StartedAt:     now.Add(-385 * time.Minute),
				EndedAt:       &s4Ended,
				Duration:      1500,
				Status:        "completed",
				CreatedAt:     now.Add(-385 * time.Minute),
				DeviceName:    "TGAM1 Wearable Headset Delta",
				DeviceCode:    "EEG-004",
				SignalQuality: 96,
			},
			{
				ID:            "ses-005",
				UserID:        "user-demo-01",
				DeviceID:      "dev-005",
				StartedAt:     now.Add(-498 * time.Minute),
				EndedAt:       &s5Ended,
				Duration:      1080,
				Status:        "completed",
				CreatedAt:     now.Add(-498 * time.Minute),
				DeviceName:    "TGAM1 Wearable Headset Theta",
				DeviceCode:    "EEG-005",
				SignalQuality: 92,
			},
		}

		for _, ses := range initialSessions {
			_ = s.CreateSession(&ses)
		}

		// Seed Brainwave features
		_ = s.SaveBrainwaveFeature(&models.BrainwaveFeature{
			ID:        "bw-001",
			SessionID: "ses-001",
			Timestamp: now.UnixMilli() - 1800000,
			Delta:     10.5,
			Theta:     15.0,
			Alpha:     48.0, // Alpha Dominant
			Beta:      18.0,
			Gamma:     8.5,
			CreatedAt: now.Add(-30 * time.Minute),
		})
		_ = s.SaveBrainwaveFeature(&models.BrainwaveFeature{
			ID:        "bw-002",
			SessionID: "ses-002",
			Timestamp: now.UnixMilli() - 7200000,
			Delta:     9.5,
			Theta:     13.5,
			Alpha:     19.0,
			Beta:      45.0, // Beta Dominant
			Gamma:     13.0,
			CreatedAt: now.Add(-120 * time.Minute),
		})
		_ = s.SaveBrainwaveFeature(&models.BrainwaveFeature{
			ID:        "bw-003",
			SessionID: "ses-003",
			Timestamp: now.UnixMilli() - 14400000,
			Delta:     8.0,
			Theta:     11.0,
			Alpha:     15.0,
			Beta:      26.0,
			Gamma:     40.0, // Gamma Dominant
			CreatedAt: now.Add(-240 * time.Minute),
		})
		_ = s.SaveBrainwaveFeature(&models.BrainwaveFeature{
			ID:        "bw-004",
			SessionID: "ses-004",
			Timestamp: now.UnixMilli() - 21600000,
			Delta:     52.0, // Delta Dominant
			Theta:     20.0,
			Alpha:     13.0,
			Beta:      9.5,
			Gamma:     5.5,
			CreatedAt: now.Add(-360 * time.Minute),
		})
		_ = s.SaveBrainwaveFeature(&models.BrainwaveFeature{
			ID:        "bw-005",
			SessionID: "ses-005",
			Timestamp: now.UnixMilli() - 28800000,
			Delta:     17.0,
			Theta:     47.0, // Theta Dominant
			Alpha:     17.5,
			Beta:      12.0,
			Gamma:     6.5,
			CreatedAt: now.Add(-480 * time.Minute),
		})

		// Seed EEG samples for all 5 sessions (120 points each)
		for sIdx, sInfo := range initialSessions {
			samples := make([]models.EEGSample, 120)
			cycles := 17.0
			switch sIdx {
			case 0:
				cycles = 17.0 // Alpha
			case 1:
				cycles = 32.0 // Beta
			case 2:
				cycles = 48.0 // Gamma
			case 3:
				cycles = 3.2 // Delta
			case 4:
				cycles = 7.5 // Theta
			}

			for i := 0; i < 120; i++ {
				phase := (float64(i) * 2.0 * math.Pi * cycles) / 120.0
				var val float64
				switch sIdx {
				case 0:
					env := 18.0 + 5.0*math.Cos((float64(i)*2.0*math.Pi*1.5)/120.0)
					val = env*math.Sin(phase) + 2.0*math.Sin(phase*2.0+0.4)
				case 1:
					val = 12.0*math.Sin(phase) + 3.5*math.Sin(phase*0.7+0.9) + 2.0*math.Sin(phase*1.4+2.1)
				case 2:
					val = 6.5*math.Sin(phase) + 2.5*math.Sin(phase*1.35+0.4)
				case 3:
					val = 36.0*math.Sin(phase) + 6.0*math.Sin(phase*0.45+0.8)
				case 4:
					val = 24.0*math.Sin(phase) + 5.0*math.Sin(phase*0.5+1.2)
				}
				val += (rand.Float64()*2.0 - 1.0) * 0.8

				samples[i] = models.EEGSample{
					ID:            fmt.Sprintf("pg-s%d-%d", sIdx+1, i),
					SessionID:     sInfo.ID,
					Timestamp:     sInfo.StartedAt.UnixMilli() + int64(i*20),
					RawEEG:        math.Round(val*100) / 100,
					SignalQuality: sInfo.SignalQuality,
					CreatedAt:     sInfo.StartedAt,
				}
			}
			_ = s.SaveEEGSamples(samples)
		}
	}
}
