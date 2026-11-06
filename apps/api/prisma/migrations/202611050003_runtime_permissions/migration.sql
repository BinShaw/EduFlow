-- Containers create a separate runtime role during database initialization.
-- Local development may use its own database owner; skip grants when absent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eduflow_app') THEN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO eduflow_app', current_database());
    GRANT USAGE ON SCHEMA public TO eduflow_app;
    GRANT SELECT, INSERT, UPDATE ON "User", "Guardian", "StudentGuardian", "Student", "OwnerChange", "Lead", "Course", "ClassGroup", "LessonSession", "TrialBooking", "FollowUp", "Enrollment", "Attendance", "CreditPurchase" TO eduflow_app;
    GRANT SELECT, INSERT ON "CreditLedger", "AuditLog" TO eduflow_app;
  END IF;
END;
$$;
