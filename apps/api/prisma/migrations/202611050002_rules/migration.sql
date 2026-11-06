CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "LessonSession" ADD CONSTRAINT "LessonSession_valid_range" CHECK ("endsAt" > "startsAt" AND capacity > 0);
ALTER TABLE "LessonSession" ADD CONSTRAINT "LessonSession_teacher_no_overlap"
  EXCLUDE USING gist ("teacherId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE (status <> 'CANCELLED');
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_valid_template"
  CHECK (weekday BETWEEN 1 AND 7 AND "durationMinutes" > 0 AND capacity > 0 AND "localStartTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "Student" ADD CONSTRAINT "Student_valid_year" CHECK ("yearLevel" IS NULL OR "yearLevel" BETWEEN 1 AND 12);
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_valid_range" CHECK ("endsOn" IS NULL OR "endsOn" >= "startsOn");
CREATE UNIQUE INDEX "TrialBooking_one_active_per_lead" ON "TrialBooking" ("leadId") WHERE status = 'BOOKED';
CREATE UNIQUE INDEX "FollowUp_one_per_trial_outcome" ON "FollowUp" ("trialBookingId") WHERE "trialBookingId" IS NOT NULL;
CREATE UNIQUE INDEX "StudentGuardian_one_primary" ON "StudentGuardian" ("studentId") WHERE "isPrimary";
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_completion_consistent"
  CHECK ((status = 'COMPLETED') = ("completedAt" IS NOT NULL));
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_positive" CHECK (credits > 0 AND ("amountCents" IS NULL OR "amountCents" >= 0));
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_delta_direction"
  CHECK (delta <> 0 AND (type <> 'PURCHASE' OR delta > 0) AND (type NOT IN ('ATTENDANCE_DEDUCTION', 'REFUND', 'EXPIRY') OR delta < 0));

CREATE FUNCTION eduflow_reject_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CreditLedger is append-only. Record a reversing entry instead.';
END;
$$;
CREATE TRIGGER "CreditLedger_immutable" BEFORE UPDATE OR DELETE ON "CreditLedger"
  FOR EACH ROW EXECUTE FUNCTION eduflow_reject_ledger_mutation();

-- Capacity and student overlap involve enrollment + trial rows in multiple tables.
-- All booking writes use serializable transactions and lock Student, User, Session,
-- then Lead in that order. There is no exposed generic session/enrollment write API.
