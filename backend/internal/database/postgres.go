package database

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"math/rand"
	"strings"
	"time"

	"eeg-backend/models"

	"github.com/google/uuid"
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
	if user.Status == "" {
		user.Status = "active"
	}
	if user.Division == "" {
		user.Division = "Biomedical & AI Lab"
	}
	if user.Position == "" {
		user.Position = "Researcher"
	}
	if user.Username == "" {
		parts := strings.Split(user.Email, "@")
		user.Username = parts[0]
	}

	query := `
		INSERT INTO users (id, username, name, email, password_hash, role, division, position, status, last_login, institution, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`
	_, err := s.db.Exec(query, user.ID, user.Username, user.Name, user.Email, user.PasswordHash, user.Role, user.Division, user.Position, user.Status, user.LastLogin, user.Institution, user.CreatedAt, user.UpdatedAt)
	if err != nil {
		// Fallback for older schema before migration 000007
		fallbackQuery := `
			INSERT INTO users (id, name, email, password_hash, role, institution, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		_, fallbackErr := s.db.Exec(fallbackQuery, user.ID, user.Name, user.Email, user.PasswordHash, user.Role, user.Institution, user.CreatedAt, user.UpdatedAt)
		return fallbackErr
	}
	return nil
}

func (s *PostgresStore) GetUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, COALESCE(username, ''), name, email, password_hash, role, 
		       COALESCE(division, 'Biomedical & AI Lab'), COALESCE(position, 'Researcher'), 
		       COALESCE(status, 'active'), last_login, institution, created_at, updated_at 
		FROM users WHERE email = $1
	`
	row := s.db.QueryRow(query, email)

	var u models.User
	if err := row.Scan(&u.ID, &u.Username, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Division, &u.Position, &u.Status, &u.LastLogin, &u.Institution, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		// Fallback for older schema
		oldQuery := `SELECT id, name, email, password_hash, role, institution, created_at, updated_at FROM users WHERE email = $1`
		oldRow := s.db.QueryRow(oldQuery, email)
		if oldErr := oldRow.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Institution, &u.CreatedAt, &u.UpdatedAt); oldErr != nil {
			if errors.Is(oldErr, sql.ErrNoRows) {
				return nil, nil
			}
			return nil, oldErr
		}
		u.Status = "active"
		u.Division = "Biomedical & AI Lab"
		u.Position = "Researcher"
		parts := strings.Split(u.Email, "@")
		u.Username = parts[0]
	}
	return &u, nil
}

func (s *PostgresStore) GetUserByID(id string) (*models.User, error) {
	query := `
		SELECT id, COALESCE(username, ''), name, email, password_hash, role, 
		       COALESCE(division, 'Biomedical & AI Lab'), COALESCE(position, 'Researcher'), 
		       COALESCE(status, 'active'), last_login, institution, created_at, updated_at 
		FROM users WHERE id = $1
	`
	row := s.db.QueryRow(query, id)

	var u models.User
	if err := row.Scan(&u.ID, &u.Username, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Division, &u.Position, &u.Status, &u.LastLogin, &u.Institution, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		// Fallback for older schema
		oldQuery := `SELECT id, name, email, password_hash, role, institution, created_at, updated_at FROM users WHERE id = $1`
		oldRow := s.db.QueryRow(oldQuery, id)
		if oldErr := oldRow.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.Institution, &u.CreatedAt, &u.UpdatedAt); oldErr != nil {
			if errors.Is(oldErr, sql.ErrNoRows) {
				return nil, nil
			}
			return nil, oldErr
		}
		u.Status = "active"
		u.Division = "Biomedical & AI Lab"
		u.Position = "Researcher"
		parts := strings.Split(u.Email, "@")
		u.Username = parts[0]
	}
	return &u, nil
}

func (s *PostgresStore) GetUsers() ([]models.User, error) {
	query := `
		SELECT id, COALESCE(username, ''), name, email, role, 
		       COALESCE(division, 'Biomedical & AI Lab'), COALESCE(position, 'Researcher'), 
		       COALESCE(status, 'active'), last_login, institution, created_at, updated_at 
		FROM users 
		ORDER BY created_at ASC
	`
	rows, err := s.db.Query(query)
	if err != nil {
		// Fallback for older schema
		oldQuery := `SELECT id, name, email, role, institution, created_at, updated_at FROM users ORDER BY created_at ASC`
		oldRows, oldErr := s.db.Query(oldQuery)
		if oldErr != nil {
			return nil, oldErr
		}
		defer oldRows.Close()

		var usersList []models.User
		for oldRows.Next() {
			var u models.User
			if err := oldRows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Institution, &u.CreatedAt, &u.UpdatedAt); err != nil {
				return nil, err
			}
			u.Status = "active"
			u.Division = "Biomedical & AI Lab"
			u.Position = "Researcher"
			parts := strings.Split(u.Email, "@")
			u.Username = parts[0]
			usersList = append(usersList, u)
		}
		if err := oldRows.Err(); err != nil {
			return nil, err
		}
		return usersList, nil
	}
	defer rows.Close()

	var usersList []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Name, &u.Email, &u.Role, &u.Division, &u.Position, &u.Status, &u.LastLogin, &u.Institution, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		if u.Username == "" {
			parts := strings.Split(u.Email, "@")
			u.Username = parts[0]
		}
		usersList = append(usersList, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return usersList, nil
}

func (s *PostgresStore) UpdateUser(user *models.User) error {
	query := `UPDATE users SET name = $1, institution = $2, updated_at = $3 WHERE id = $4`
	_, err := s.db.Exec(query, user.Name, user.Institution, time.Now(), user.ID)
	return err
}

func (s *PostgresStore) UpdateUserStatus(id string, status string) error {
	query := `UPDATE users SET status = $1, updated_at = $2 WHERE id = $3`
	_, err := s.db.Exec(query, status, time.Now(), id)
	return err
}

func (s *PostgresStore) ResetUserPassword(id string, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`
	_, err := s.db.Exec(query, passwordHash, time.Now(), id)
	return err
}

func (s *PostgresStore) UpdateUserLastLogin(id string, lastLogin time.Time) error {
	query := `UPDATE users SET last_login = $1 WHERE id = $2`
	_, err := s.db.Exec(query, lastLogin, id)
	return err
}

func (s *PostgresStore) GetDevices() ([]models.Device, error) {
	query := `SELECT id, device_code, name, status, battery_level, signal_quality, signal_quality_updated_at, firmware_version, last_seen, last_eeg_stream_at, created_at, updated_at FROM devices ORDER BY name ASC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []models.Device
	for rows.Next() {
		var d models.Device
		var sigQuality sql.NullInt32
		var sigQualityUpdatedAt sql.NullTime
		var lastStreamAt sql.NullTime
		if err := rows.Scan(&d.ID, &d.DeviceCode, &d.Name, &d.Status, &d.BatteryLevel, &sigQuality, &sigQualityUpdatedAt, &d.FirmwareVersion, &d.LastSeen, &lastStreamAt, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		if sigQuality.Valid {
			v := int(sigQuality.Int32)
			d.SignalQuality = &v
		}
		if sigQualityUpdatedAt.Valid {
			d.SignalQualityUpdatedAt = &sigQualityUpdatedAt.Time
		}
		if lastStreamAt.Valid {
			d.LastEEGStreamAt = &lastStreamAt.Time
		}
		devices = append(devices, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return devices, nil
}

func (s *PostgresStore) GetDeviceByID(id string) (*models.Device, error) {
	query := `SELECT id, device_code, name, status, battery_level, signal_quality, signal_quality_updated_at, firmware_version, last_seen, last_eeg_stream_at, created_at, updated_at FROM devices WHERE id = $1`
	row := s.db.QueryRow(query, id)

	var d models.Device
	var sigQuality sql.NullInt32
	var sigQualityUpdatedAt sql.NullTime
	var lastStreamAt sql.NullTime
	if err := row.Scan(&d.ID, &d.DeviceCode, &d.Name, &d.Status, &d.BatteryLevel, &sigQuality, &sigQualityUpdatedAt, &d.FirmwareVersion, &d.LastSeen, &lastStreamAt, &d.CreatedAt, &d.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if sigQuality.Valid {
		v := int(sigQuality.Int32)
		d.SignalQuality = &v
	}
	if sigQualityUpdatedAt.Valid {
		d.SignalQualityUpdatedAt = &sigQualityUpdatedAt.Time
	}
	if lastStreamAt.Valid {
		d.LastEEGStreamAt = &lastStreamAt.Time
	}
	return &d, nil
}

func (s *PostgresStore) CreateDevice(device *models.Device) error {
	query := `
		INSERT INTO devices (id, device_code, name, status, battery_level, signal_quality, signal_quality_updated_at, firmware_version, last_seen, last_eeg_stream_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := s.db.Exec(query, device.ID, device.DeviceCode, device.Name, device.Status, device.BatteryLevel, device.SignalQuality, device.SignalQualityUpdatedAt, device.FirmwareVersion, device.LastSeen, device.LastEEGStreamAt, device.CreatedAt, device.UpdatedAt)
	return err
}

func (s *PostgresStore) UpdateDevice(device *models.Device) error {
	query := `
		UPDATE devices 
		SET name = $1, status = $2, battery_level = $3, signal_quality = $4, signal_quality_updated_at = $5, updated_at = $6, last_seen = $7, last_eeg_stream_at = $8
		WHERE id = $9
	`
	_, err := s.db.Exec(query, device.Name, device.Status, device.BatteryLevel, device.SignalQuality, device.SignalQualityUpdatedAt, time.Now(), device.LastSeen, device.LastEEGStreamAt, device.ID)
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
			SELECT s.id, s.user_id, s.device_id,
			       COALESCE(s.participant_name, ''), COALESCE(s.title, ''), COALESCE(s.notes, ''), COALESCE(s.acquisition_mode, 'simulated'),
			       s.started_at, s.ended_at, s.duration, s.status,
			       COALESCE(s.target_band, 'ALPHA'), s.created_at,
			       d.name, d.device_code, d.signal_quality
			FROM sessions s
			LEFT JOIN devices d ON s.device_id = d.id
			WHERE (s.user_id = $1 OR s.user_id = 'user-demo-01')
			ORDER BY s.started_at DESC
		`
		rows, err = s.db.Query(query, userID)
	} else {
		query = `
			SELECT s.id, s.user_id, s.device_id,
			       COALESCE(s.participant_name, ''), COALESCE(s.title, ''), COALESCE(s.notes, ''), COALESCE(s.acquisition_mode, 'simulated'),
			       s.started_at, s.ended_at, s.duration, s.status,
			       COALESCE(s.target_band, 'ALPHA'), s.created_at,
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

		if err := rows.Scan(&s.ID, &s.UserID, &s.DeviceID, &s.ParticipantName, &s.Title, &s.Notes, &s.AcquisitionMode, &s.StartedAt, &endedAt, &s.Duration, &s.Status, &s.TargetBand, &s.CreatedAt, &devName, &devCode, &sigQuality); err != nil {
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
			v := int(sigQuality.Int32)
			s.SignalQuality = &v
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
		SELECT s.id, s.user_id, s.device_id,
		       COALESCE(s.participant_name, ''), COALESCE(s.title, ''), COALESCE(s.notes, ''), COALESCE(s.acquisition_mode, 'simulated'),
		       s.started_at, s.ended_at, s.duration, s.status,
		       COALESCE(s.target_band, 'ALPHA'), s.created_at,
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

	if err := row.Scan(&ses.ID, &ses.UserID, &ses.DeviceID, &ses.ParticipantName, &ses.Title, &ses.Notes, &ses.AcquisitionMode, &ses.StartedAt, &endedAt, &ses.Duration, &ses.Status, &ses.TargetBand, &ses.CreatedAt, &devName, &devCode, &sigQuality); err != nil {
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
		v := int(sigQuality.Int32)
		ses.SignalQuality = &v
	}
	return &ses, nil
}

func (s *PostgresStore) GetActiveSessionByDevice(deviceID string) (*models.Session, error) {
	query := `
		SELECT s.id, s.user_id, s.device_id,
		       COALESCE(s.participant_name, ''), COALESCE(s.title, ''), COALESCE(s.notes, ''), COALESCE(s.acquisition_mode, 'simulated'),
		       s.started_at, s.ended_at, s.duration, s.status,
		       COALESCE(s.target_band, 'ALPHA'), s.created_at,
		       d.name, d.device_code, d.signal_quality
		FROM sessions s
		LEFT JOIN devices d ON s.device_id = d.id
		WHERE s.device_id = $1 AND s.status IN ('running', 'stop_requested')
		ORDER BY s.started_at DESC
		LIMIT 1
	`
	row := s.db.QueryRow(query, deviceID)

	var ses models.Session
	var endedAt sql.NullTime
	var devName, devCode sql.NullString
	var sigQuality sql.NullInt32

	if err := row.Scan(&ses.ID, &ses.UserID, &ses.DeviceID, &ses.ParticipantName, &ses.Title, &ses.Notes, &ses.AcquisitionMode, &ses.StartedAt, &endedAt, &ses.Duration, &ses.Status, &ses.TargetBand, &ses.CreatedAt, &devName, &devCode, &sigQuality); err != nil {
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
		v := int(sigQuality.Int32)
		ses.SignalQuality = &v
	}
	return &ses, nil
}

func (s *PostgresStore) CreateSession(session *models.Session) error {
	if session.TargetBand == "" {
		session.TargetBand = "ALPHA"
	}
	if session.AcquisitionMode == "" {
		session.AcquisitionMode = "simulated"
	}
	query := `
		INSERT INTO sessions (id, user_id, device_id, participant_name, title, notes, acquisition_mode, started_at, duration, status, target_band, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (id) DO NOTHING
	`
	_, err := s.db.Exec(query, session.ID, session.UserID, session.DeviceID, session.ParticipantName, session.Title, session.Notes, session.AcquisitionMode, session.StartedAt, session.Duration, session.Status, session.TargetBand, session.CreatedAt)
	return err
}

func (s *PostgresStore) UpdateSession(session *models.Session) error {
	query := `
		UPDATE sessions
		SET participant_name = $1, title = $2, notes = $3
		WHERE id = $4
	`
	_, err := s.db.Exec(query, session.ParticipantName, session.Title, session.Notes, session.ID)
	return err
}

func (s *PostgresStore) RequestStopSession(id string) (*models.Session, error) {
	now := time.Now()
	ses, err := s.GetSessionByID(id)
	if err != nil {
		return nil, err
	}
	if ses == nil {
		return nil, fmt.Errorf("session not found")
	}

	// Idempotent: If already completed or stop_requested, preserve state and return as-is
	if ses.Status == "completed" || ses.Status == "stop_requested" {
		return ses, nil
	}

	duration := int(now.Sub(ses.StartedAt).Seconds())
	if duration < 0 {
		duration = 0
	}

	// Atomic conditional UPDATE: only transitions if currently 'running'
	query := `
		UPDATE sessions
		SET ended_at = $1, duration = $2, status = 'stop_requested'
		WHERE id = $3 AND status = 'running'
	`
	_, err = s.db.Exec(query, now, duration, id)
	if err != nil {
		return nil, err
	}

	return s.GetSessionByID(id)
}

func (s *PostgresStore) FinalizeSessionWithJob(id string) (*models.Session, *models.MLClassificationJob, bool, error) {
	now := time.Now()

	tx, err := s.db.Begin()
	if err != nil {
		return nil, nil, false, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. Atomic conditional UPDATE:
	// Only transitions status if currently 'running' or 'stop_requested'.
	query := `
		UPDATE sessions
		SET ended_at = COALESCE(ended_at, $1),
		    duration = CASE 
		        WHEN duration > 0 THEN duration 
		        ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(ended_at, $1) - started_at))::integer)
		    END,
		    status = 'completed'
		WHERE id = $2 AND status IN ('running', 'stop_requested')
	`
	res, err := tx.Exec(query, now, id)
	if err != nil {
		return nil, nil, false, fmt.Errorf("failed to finalize session in tx: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, nil, false, err
	}

	transitioned := rowsAffected > 0

	var job *models.MLClassificationJob
	if transitioned {
		// 2. Create ML Job within the SAME transaction
		job = &models.MLClassificationJob{
			ID:          uuid.New().String(),
			SessionID:   id,
			Status:      "pending",
			Attempts:    0,
			MaxAttempts: 3,
			NextRunAt:   now,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		insertJobQuery := `
			INSERT INTO ml_classification_jobs (id, session_id, status, attempts, max_attempts, last_error, next_run_at, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (session_id) DO NOTHING
		`
		if _, err := tx.Exec(insertJobQuery, job.ID, job.SessionID, job.Status, job.Attempts, job.MaxAttempts, job.LastError, job.NextRunAt, job.CreatedAt, job.UpdatedAt); err != nil {
			return nil, nil, false, fmt.Errorf("failed to create durable ML job in tx: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, false, fmt.Errorf("failed to commit transaction: %w", err)
	}

	ses, err := s.GetSessionByID(id)
	if err != nil {
		return nil, nil, false, err
	}
	if ses == nil {
		return nil, nil, false, fmt.Errorf("session not found")
	}

	if !transitioned {
		existingJob, _ := s.GetMLJobBySessionID(id)
		return ses, existingJob, false, nil
	}

	return ses, job, true, nil
}

func (s *PostgresStore) FinalizeSession(id string) (*models.Session, bool, error) {
	ses, _, transitioned, err := s.FinalizeSessionWithJob(id)
	return ses, transitioned, err
}

func (s *PostgresStore) StopSession(id string) (*models.Session, error) {
	ses, _, err := s.FinalizeSession(id)
	return ses, err
}

func (s *PostgresStore) RecoverStaleStopRequestedSessions(cutoffDuration time.Duration) ([]models.Session, error) {
	now := time.Now()
	cutoffTime := now.Add(-cutoffDuration)

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Atomic conditional query: finds and transitions only sessions in 'stop_requested' with age >= cutoffDuration
	query := `
		UPDATE sessions
		SET ended_at = COALESCE(ended_at, $1),
		    duration = CASE 
		        WHEN duration > 0 THEN duration 
		        ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(ended_at, $1) - started_at))::integer)
		    END,
		    status = 'completed'
		WHERE status = 'stop_requested'
		  AND (ended_at <= $2 OR (ended_at IS NULL AND started_at <= $2))
		RETURNING id
	`
	rows, err := tx.Query(query, now, cutoffTime)
	if err != nil {
		return nil, err
	}

	var recoveredIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			recoveredIDs = append(recoveredIDs, id)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// For each recovered session, insert pending ML job within the SAME transaction
	insertJobQuery := `
		INSERT INTO ml_classification_jobs (id, session_id, status, attempts, max_attempts, last_error, next_run_at, created_at, updated_at)
		VALUES ($1, $2, 'pending', 0, 3, '', $3, $3, $3)
		ON CONFLICT (session_id) DO NOTHING
	`
	for _, id := range recoveredIDs {
		jobID := uuid.New().String()
		if _, err := tx.Exec(insertJobQuery, jobID, id, now); err != nil {
			return nil, fmt.Errorf("failed to enqueue ML job for recovered session %s in tx: %w", id, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	var recovered []models.Session
	for _, id := range recoveredIDs {
		if ses, err := s.GetSessionByID(id); err == nil && ses != nil {
			recovered = append(recovered, *ses)
		}
	}

	return recovered, nil
}

func (s *PostgresStore) ReconcileCompletedSessionsWithoutJobs() ([]models.MLClassificationJob, error) {
	query := `
		SELECT s.id
		FROM sessions s
		WHERE s.status = 'completed'
		  AND NOT EXISTS (SELECT 1 FROM ml_classification_jobs j WHERE j.session_id = s.id)
		  AND NOT EXISTS (SELECT 1 FROM ml_predictions p WHERE p.session_id = s.id)
		  AND (
		      EXISTS (SELECT 1 FROM brainwave_features f WHERE f.session_id = s.id)
		      OR EXISTS (SELECT 1 FROM eeg_samples e WHERE e.session_id = s.id)
		  )
		ORDER BY s.started_at ASC
	`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query un-reconciled sessions: %w", err)
	}
	defer rows.Close()

	var sessionIDs []string
	for rows.Next() {
		var sid string
		if err := rows.Scan(&sid); err != nil {
			return nil, err
		}
		sessionIDs = append(sessionIDs, sid)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(sessionIDs) == 0 {
		return nil, nil
	}

	var createdJobs []models.MLClassificationJob
	now := time.Now()

	insertQuery := `
		INSERT INTO ml_classification_jobs (id, session_id, status, attempts, max_attempts, last_error, next_run_at, created_at, updated_at)
		VALUES ($1, $2, 'pending', 0, 3, '', $3, $3, $3)
		ON CONFLICT (session_id) DO NOTHING
		RETURNING id, session_id, status, attempts, max_attempts, last_error, next_run_at, created_at, updated_at
	`
	for _, sid := range sessionIDs {
		jobID := uuid.New().String()
		var j models.MLClassificationJob
		err := s.db.QueryRow(insertQuery, jobID, sid, now).Scan(&j.ID, &j.SessionID, &j.Status, &j.Attempts, &j.MaxAttempts, &j.LastError, &j.NextRunAt, &j.CreatedAt, &j.UpdatedAt)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			log.Printf("[RECONCILIATION ERROR] Failed to create job for session %s: %v", sid, err)
			continue
		}
		createdJobs = append(createdJobs, j)
		log.Printf("[RECONCILIATION] Created missing ML job %s for completed session %s", j.ID, sid)
	}

	return createdJobs, nil
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

	stmt, err := tx.Prepare(`INSERT INTO eeg_samples (id, session_id, timestamp, raw_eeg, signal_quality, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`)
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
		ON CONFLICT (id) DO NOTHING
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

func (s *PostgresStore) CreateMLJob(job *models.MLClassificationJob) error {
	query := `
		INSERT INTO ml_classification_jobs (id, session_id, status, attempts, max_attempts, last_error, next_run_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (session_id) DO NOTHING
	`
	now := time.Now()
	createdAt := job.CreatedAt
	if createdAt.IsZero() {
		createdAt = now
	}
	updatedAt := job.UpdatedAt
	if updatedAt.IsZero() {
		updatedAt = createdAt
	}
	nextRunAt := job.NextRunAt
	if nextRunAt.IsZero() {
		nextRunAt = createdAt
	}
	status := job.Status
	if status == "" {
		status = "pending"
	}
	maxAttempts := job.MaxAttempts
	if maxAttempts <= 0 {
		maxAttempts = 3
	}
	_, err := s.db.Exec(query, job.ID, job.SessionID, status, job.Attempts, maxAttempts, job.LastError, nextRunAt, createdAt, updatedAt)
	return err
}

func (s *PostgresStore) GetMLJobBySessionID(sessionID string) (*models.MLClassificationJob, error) {
	query := `
		SELECT id, session_id, status, attempts, max_attempts, last_error, next_run_at, created_at, updated_at, completed_at
		FROM ml_classification_jobs
		WHERE session_id = $1
	`
	row := s.db.QueryRow(query, sessionID)
	var j models.MLClassificationJob
	var completedAt sql.NullTime
	if err := row.Scan(&j.ID, &j.SessionID, &j.Status, &j.Attempts, &j.MaxAttempts, &j.LastError, &j.NextRunAt, &j.CreatedAt, &j.UpdatedAt, &completedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if completedAt.Valid {
		j.CompletedAt = &completedAt.Time
	}
	return &j, nil
}

func (s *PostgresStore) ClaimNextPendingMLJobs(limit int) ([]models.MLClassificationJob, error) {
	if limit <= 0 {
		limit = 10
	}
	query := `
		UPDATE ml_classification_jobs
		SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
		WHERE id IN (
			SELECT id FROM ml_classification_jobs
			WHERE (status = 'pending' OR (status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes'))
			  AND next_run_at <= NOW()
			  AND attempts < max_attempts
			ORDER BY created_at ASC
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, session_id, status, attempts, max_attempts, last_error, next_run_at, created_at, updated_at, completed_at
	`
	rows, err := s.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []models.MLClassificationJob
	for rows.Next() {
		var j models.MLClassificationJob
		var completedAt sql.NullTime
		if err := rows.Scan(&j.ID, &j.SessionID, &j.Status, &j.Attempts, &j.MaxAttempts, &j.LastError, &j.NextRunAt, &j.CreatedAt, &j.UpdatedAt, &completedAt); err != nil {
			return nil, err
		}
		if completedAt.Valid {
			j.CompletedAt = &completedAt.Time
		}
		jobs = append(jobs, j)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return jobs, nil
}

func (s *PostgresStore) UpdateMLJob(job *models.MLClassificationJob) error {
	query := `
		UPDATE ml_classification_jobs
		SET status = $1, attempts = $2, max_attempts = $3, last_error = $4, next_run_at = $5, completed_at = $6, updated_at = $7
		WHERE id = $8
	`
	now := time.Now()
	var completedAt sql.NullTime
	if job.CompletedAt != nil {
		completedAt = sql.NullTime{Time: *job.CompletedAt, Valid: true}
	}
	_, err := s.db.Exec(query, job.Status, job.Attempts, job.MaxAttempts, job.LastError, job.NextRunAt, completedAt, now, job.ID)
	return err
}

func (s *PostgresStore) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// SeedInitialData creates standard starter records if tables are empty
func (s *PostgresStore) SeedInitialData() {
	// Ensure default admin user (admin@gmail.com / admin123) is always available
	const adminHash = "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li"
	_, _ = s.db.Exec("UPDATE users SET email = 'admin@gmail.com', password_hash = $1 WHERE email IN ('researcher@biomedical.ac.id', 'demo@research.eeg')", adminHash)

	var existingUserId string
	err := s.db.QueryRow("SELECT id FROM users WHERE email = 'admin@gmail.com'").Scan(&existingUserId)
	if err == nil {
		_, _ = s.db.Exec("UPDATE users SET password_hash = $1, role = 'superadmin', name = 'Super Admin NeuroPulse', username = 'superadmin', division = 'IT & Telemetry', position = 'Head of Platform & IT', status = 'active', institution = 'IPB University' WHERE email = 'admin@gmail.com'", adminHash)
		_, _ = s.db.Exec("UPDATE sessions SET user_id = $1 WHERE user_id = 'user-demo-01'", existingUserId)
	} else {
		adminId := "user-demo-01"
		var idTaken bool
		_ = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", adminId).Scan(&idTaken)
		if idTaken {
			adminId = "user-admin-01"
		}
		_ = s.CreateUser(&models.User{
			ID:           adminId,
			Username:     "superadmin",
			Name:         "Super Admin NeuroPulse",
			Email:        "admin@gmail.com",
			PasswordHash: adminHash,
			Role:         "superadmin",
			Division:     "IT & Telemetry",
			Position:     "Head of Platform & IT",
			Status:       "active",
			Institution:  "IPB University",
			CreatedAt:    time.Now().Add(-120 * 24 * time.Hour),
			UpdatedAt:    time.Now(),
		})
	}

	// Ensure virzasiutaa@gmail.com is configured as Admin
	var virzaId string
	err = s.db.QueryRow("SELECT id FROM users WHERE email = 'virzasiutaa@gmail.com'").Scan(&virzaId)
	if err == nil {
		_, _ = s.db.Exec("UPDATE users SET role = 'admin', position = 'Administrator', status = 'active', password_hash = CASE WHEN password_hash LIKE 'oauth2_%' THEN $1 ELSE password_hash END WHERE email = 'virzasiutaa@gmail.com'", adminHash)
	} else {
		virzaId = "user-admin-virza"
		_ = s.CreateUser(&models.User{
			ID:           virzaId,
			Username:     "virzasiutaa",
			Name:         "Virza Siuta",
			Email:        "virzasiutaa@gmail.com",
			PasswordHash: adminHash,
			Role:         "admin",
			Division:     "Biomedical & Hardware",
			Position:     "Administrator",
			Status:       "active",
			Institution:  "IPB University",
			CreatedAt:    time.Now().Add(-30 * 24 * time.Hour),
			UpdatedAt:    time.Now(),
		})
	}

	// Seed team members across laboratory divisions if users count is low
	var userCount int
	_ = s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if userCount < 4 {
		log.Println("[Postgres] Seeding team laboratory users...")
		now := time.Now()
		t1 := now.Add(-2 * time.Hour)
		t2 := now.Add(-18 * time.Hour)
		t3 := now.Add(-36 * time.Hour)
		t4 := now.Add(-5 * 24 * time.Hour)

		seedUsers := []models.User{
			{
				ID:           "user-lab-02",
				Username:     "septi.a",
				Name:         "Septi Anggraini",
				Email:        "septi.tax@neuropulse.id",
				PasswordHash: adminHash,
				Role:         "head",
				Division:     "Clinical Research",
				Position:     "Head of Clinical Protocol",
				Status:       "active",
				LastLogin:    &t1,
				Institution:  "IPB University",
				CreatedAt:    now.Add(-60 * 24 * time.Hour),
				UpdatedAt:    now,
			},
			{
				ID:           "user-lab-03",
				Username:     "renaldi.s",
				Name:         "Renaldi Simamora",
				Email:        "renaldi.s@neuropulse.id",
				PasswordHash: adminHash,
				Role:         "engineer",
				Division:     "Biomedical & Hardware",
				Position:     "Lead Biomedical Engineer",
				Status:       "active",
				LastLogin:    &t2,
				Institution:  "IPB University",
				CreatedAt:    now.Add(-45 * 24 * time.Hour),
				UpdatedAt:    now,
			},
			{
				ID:           "user-lab-04",
				Username:     "budi.s",
				Name:         "Dr. Budi Santoso",
				Email:        "budi.santoso@neuropulse.id",
				PasswordHash: adminHash,
				Role:         "researcher",
				Division:     "AI & Signal Processing",
				Position:     "Lead Machine Learning Researcher",
				Status:       "active",
				LastLogin:    &t3,
				Institution:  "IPB University",
				CreatedAt:    now.Add(-30 * 24 * time.Hour),
				UpdatedAt:    now,
			},
			{
				ID:           "user-lab-05",
				Username:     "dina.p",
				Name:         "Dina Permatasari",
				Email:        "dina.p@neuropulse.id",
				PasswordHash: adminHash,
				Role:         "staff",
				Division:     "Clinical Research",
				Position:     "EEG Lab Technician",
				Status:       "active",
				LastLogin:    &t4,
				Institution:  "IPB University",
				CreatedAt:    now.Add(-20 * 24 * time.Hour),
				UpdatedAt:    now,
			},
			{
				ID:           "user-lab-06",
				Username:     "faisal.h",
				Name:         "Faisal Hakim",
				Email:        "faisal.h@neuropulse.id",
				PasswordHash: adminHash,
				Role:         "engineer",
				Division:     "Biomedical & Hardware",
				Position:     "Junior Hardware Associate",
				Status:       "inactive", // Sample inactive user
				LastLogin:    nil,
				Institution:  "IPB University",
				CreatedAt:    now.Add(-10 * 24 * time.Hour),
				UpdatedAt:    now,
			},
			{
				ID:           "user-lab-07",
				Username:     "tari.w",
				Name:         "Tari Wulandari",
				Email:        "tari.w@neuropulse.id",
				PasswordHash: adminHash,
				Role:         "staff",
				Division:     "GA & Laboratory Operations",
				Position:     "Lab Ethics & Compliance Officer",
				Status:       "active",
				LastLogin:    &t2,
				Institution:  "IPB University",
				CreatedAt:    now.Add(-15 * 24 * time.Hour),
				UpdatedAt:    now,
			},
		}

		for _, u := range seedUsers {
			_ = s.CreateUser(&u)
		}
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
				SignalQuality:   nil,
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
				SignalQuality:   nil,
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
				SignalQuality:   nil,
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
				SignalQuality:   nil,
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
				SignalQuality:   nil,
				FirmwareVersion: "v1.2.4-esp32",
				LastSeen:        time.Now(),
				CreatedAt:       time.Now().Add(-48 * time.Hour),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              "esp32-eeg-gateway-01",
				DeviceCode:      "ESP32-HW-01",
				Name:            "ESP32 TGAM1 Hardware Gateway",
				Status:          "connected",
				BatteryLevel:    100,
				SignalQuality:   nil,
				FirmwareVersion: "v1.2.0-esp32",
				LastSeen:        time.Now(),
				CreatedAt:       time.Now().Add(-24 * time.Hour),
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
			Name:         "Super Admin NeuroPulse",
			Email:        "admin@gmail.com",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "researcher",
			Institution:  "IPB University",
			CreatedAt:    now.Add(-72 * time.Hour),
			UpdatedAt:    now,
		})

		initialSessions := []models.Session{
			{
				ID:              "ses-001",
				UserID:          "user-demo-01",
				DeviceID:        "dev-001",
				Title:           "Simulated Alpha Band Demonstration",
				ParticipantName: "Demo Participant Alpha",
				AcquisitionMode: "simulated",
				StartedAt:       now.Add(-45 * time.Minute),
				EndedAt:         &s1Ended,
				Duration:        900,
				Status:          "completed",
				CreatedAt:       now.Add(-45 * time.Minute),
				DeviceName:      "TGAM1 Wearable Headset Alpha",
				DeviceCode:      "EEG-001",
				SignalQuality:   nil,
			},
			{
				ID:              "ses-002",
				UserID:          "user-demo-01",
				DeviceID:        "dev-002",
				Title:           "Simulated Beta Band Demonstration",
				ParticipantName: "Demo Participant Beta",
				AcquisitionMode: "simulated",
				StartedAt:       now.Add(-140 * time.Minute),
				EndedAt:         &s2Ended,
				Duration:        1200,
				Status:          "completed",
				CreatedAt:       now.Add(-140 * time.Minute),
				DeviceName:      "TGAM1 Wearable Headset Beta",
				DeviceCode:      "EEG-002",
				SignalQuality:   nil,
			},
			{
				ID:              "ses-003",
				UserID:          "user-demo-01",
				DeviceID:        "dev-003",
				Title:           "Simulated Gamma Band Demonstration",
				ParticipantName: "Demo Participant Gamma",
				AcquisitionMode: "simulated",
				StartedAt:       now.Add(-252 * time.Minute),
				EndedAt:         &s3Ended,
				Duration:        720,
				Status:          "completed",
				CreatedAt:       now.Add(-252 * time.Minute),
				DeviceName:      "TGAM1 Wearable Headset Gamma",
				DeviceCode:      "EEG-003",
				SignalQuality:   nil,
			},
			{
				ID:              "ses-004",
				UserID:          "user-demo-01",
				DeviceID:        "dev-004",
				Title:           "Simulated Delta Band Demonstration",
				ParticipantName: "Demo Participant Delta",
				AcquisitionMode: "simulated",
				StartedAt:       now.Add(-385 * time.Minute),
				EndedAt:         &s4Ended,
				Duration:        1500,
				Status:          "completed",
				CreatedAt:       now.Add(-385 * time.Minute),
				DeviceName:      "TGAM1 Wearable Headset Delta",
				DeviceCode:      "EEG-004",
				SignalQuality:   nil,
			},
			{
				ID:              "ses-005",
				UserID:          "user-demo-01",
				DeviceID:        "dev-005",
				Title:           "Simulated Theta Band Demonstration",
				ParticipantName: "Demo Participant Theta",
				AcquisitionMode: "simulated",
				StartedAt:       now.Add(-498 * time.Minute),
				EndedAt:         &s5Ended,
				Duration:        1080,
				Status:          "completed",
				CreatedAt:       now.Add(-498 * time.Minute),
				DeviceName:      "TGAM1 Wearable Headset Theta",
				DeviceCode:      "EEG-005",
				SignalQuality:   nil,
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

				sqVal := 0
				if sInfo.SignalQuality != nil {
					sqVal = *sInfo.SignalQuality
				}
				samples[i] = models.EEGSample{
					ID:            fmt.Sprintf("pg-s%d-%d", sIdx+1, i),
					SessionID:     sInfo.ID,
					Timestamp:     sInfo.StartedAt.UnixMilli() + int64(i*20),
					RawEEG:        math.Round(val*100) / 100,
					SignalQuality: sqVal,
					CreatedAt:     sInfo.StartedAt,
				}
			}
			_ = s.SaveEEGSamples(samples)
		}
	}
}
