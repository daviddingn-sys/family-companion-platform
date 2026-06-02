import {
  date,
  index,
  integer,
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
