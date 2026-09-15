-- Synthetic appointments for the disposable template preview.
INSERT INTO staff (id, name, email, title, color) VALUES
 (1, 'Alex', 'alex@example.test', 'Senior stylist', '#3b82f6'),
 (2, 'Jordan', 'jordan@example.test', 'Stylist', '#10b981');
INSERT INTO services (id, name, description, duration, price, color, category) VALUES
 (1, 'Cut and finish', 'Consultation, haircut and styling', 60, 55, '#3b82f6', 'Hair'),
 (2, 'Blow dry', 'Wash and styling', 30, 30, '#10b981', 'Hair'),
 (3, 'Colour refresh', 'Root touch-up and finish', 90, 90, '#8b5cf6', 'Colour');
INSERT INTO clients (id, name, email, notes) VALUES
 (1, 'Jamie Rivera', 'jamie@example.test', 'Prefers a quiet appointment.'),
 (2, 'Casey Morgan', 'casey@example.test', 'Consultation before changing colour.'),
 (3, 'Riley Chen', 'riley@example.test', 'Usually books a morning appointment.');
INSERT INTO appointments (id, identifier, client_id, staff_id, status, scheduled_date, start_time, end_time, total_price) VALUES
 (1, 'APT-1', 1, 1, 'completed', date('now'), '09:00', '10:00', 55),
 (2, 'APT-2', 2, 2, 'booked', date('now'), '15:00', '16:30', 90),
 (3, 'APT-3', 3, 1, 'booked', date('now', '+1 day'), '10:00', '10:30', 30);
INSERT INTO appointment_services (appointment_id, service_id, price, duration) VALUES
 (1, 1, 55, 60), (2, 3, 90, 90), (3, 2, 30, 30);
INSERT INTO appointment_notes (appointment_id, content) VALUES
 (2, 'Review the colour swatches during the consultation.');
INSERT INTO _meta (key, value) VALUES ('appointment_counter', '3'), ('appointment_prefix', 'APT');
