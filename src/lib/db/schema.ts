import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => profiles.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull().references(() => families.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),
    role: text("role").notNull().default("member"),
    relationship: text("relationship"),
    status: text("status").notNull().default("active"),
    invitedEmail: text("invited_email"),
    invitedPhone: text("invited_phone"),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("family_members_family_user_idx").on(table.familyId, table.userId),
  ],
);

export const elders = pgTable("elders", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  gender: text("gender").notNull().default("unknown"),
  birthDate: date("birth_date"),
  phone: text("phone"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  address: text("address"),
  medicalNotes: text("medical_notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bloodPressureRecords = pgTable(
  "blood_pressure_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull().references(() => families.id, {
      onDelete: "cascade",
    }),
    elderId: uuid("elder_id").notNull().references(() => elders.id, {
      onDelete: "cascade",
    }),
    recordedBy: uuid("recorded_by").notNull().references(() => profiles.id),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    period: text("period").notNull(),
    systolic: integer("systolic").notNull(),
    diastolic: integer("diastolic").notNull(),
    pulse: integer("pulse").notNull(),
    imageKey: text("image_key"),
    source: text("source").notNull().default("web"),
    status: text("status").notNull().default("confirmed"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("bp_records_family_id_idx").on(table.familyId),
    index("bp_records_elder_id_idx").on(table.elderId),
    index("bp_records_measured_at_idx").on(table.measuredAt),
    index("bp_records_elder_measured_at_idx").on(table.elderId, table.measuredAt),
  ],
);

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull().references(() => families.id, {
      onDelete: "cascade",
    }),
    elderId: uuid("elder_id").notNull().references(() => elders.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    dosage: text("dosage"),
    frequency: text("frequency"),
    instructions: text("instructions"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: text("status").notNull().default("active"),
    note: text("note"),
    createdBy: uuid("created_by").notNull().references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("medications_family_id_idx").on(table.familyId),
    index("medications_elder_id_idx").on(table.elderId),
    index("medications_status_idx").on(table.status),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull().references(() => families.id, {
      onDelete: "cascade",
    }),
    elderId: uuid("elder_id").notNull().references(() => elders.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    type: text("type").notNull().default("custom"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    repeatRule: text("repeat_rule"),
    status: text("status").notNull().default("active"),
    note: text("note"),
    createdBy: uuid("created_by").notNull().references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reminders_family_id_idx").on(table.familyId),
    index("reminders_elder_id_idx").on(table.elderId),
    index("reminders_due_at_idx").on(table.dueAt),
    index("reminders_status_idx").on(table.status),
  ],
);

export const abnormalEvents = pgTable(
  "abnormal_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull().references(() => families.id, {
      onDelete: "cascade",
    }),
    elderId: uuid("elder_id").notNull().references(() => elders.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    eventType: text("event_type").notNull().default("other"),
    severity: text("severity").notNull().default("medium"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("open"),
    description: text("description"),
    relatedBloodPressureRecordId: uuid("related_blood_pressure_record_id").references(
      () => bloodPressureRecords.id,
      { onDelete: "set null" },
    ),
    createdBy: uuid("created_by").notNull().references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("abnormal_events_family_id_idx").on(table.familyId),
    index("abnormal_events_elder_id_idx").on(table.elderId),
    index("abnormal_events_occurred_at_idx").on(table.occurredAt),
    index("abnormal_events_status_idx").on(table.status),
    index("abnormal_events_severity_idx").on(table.severity),
  ],
);

export const healthReports = pgTable(
  "health_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull().references(() => families.id, {
      onDelete: "cascade",
    }),
    elderId: uuid("elder_id").notNull().references(() => elders.id, {
      onDelete: "cascade",
    }),
    periodType: text("period_type").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    aiSummary: text("ai_summary"),
    aiModel: text("ai_model"),
    aiGeneratedAt: timestamp("ai_generated_at", { withTimezone: true }),
    stats: jsonb("stats").notNull(),
    generatedBy: uuid("generated_by").notNull().references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("health_reports_family_id_idx").on(table.familyId),
    index("health_reports_elder_id_idx").on(table.elderId),
    index("health_reports_period_idx").on(table.periodType, table.periodStart, table.periodEnd),
  ],
);

export const companionMessages = pgTable(
  "companion_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id").notNull().references(() => families.id, {
      onDelete: "cascade",
    }),
    elderId: uuid("elder_id").notNull().references(() => elders.id, {
      onDelete: "cascade",
    }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    model: text("model"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("companion_messages_family_id_idx").on(table.familyId),
    index("companion_messages_elder_id_idx").on(table.elderId),
    index("companion_messages_created_at_idx").on(table.createdAt),
  ],
);
