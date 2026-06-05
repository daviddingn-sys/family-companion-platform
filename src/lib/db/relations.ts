import { relations } from "drizzle-orm";
import {
  abnormalEvents,
  bloodPressureRecords,
  elders,
  families,
  familyMembers,
  healthReports,
  medications,
  profiles,
  reminders,
} from "./schema";

export const profileRelations = relations(profiles, ({ many }) => ({
  ownedFamilies: many(families),
  familyMemberships: many(familyMembers),
  createdElders: many(elders),
  bloodPressureRecords: many(bloodPressureRecords),
  medications: many(medications),
  reminders: many(reminders),
  abnormalEvents: many(abnormalEvents),
  healthReports: many(healthReports),
}));

export const familyRelations = relations(families, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [families.ownerUserId],
    references: [profiles.id],
  }),
  members: many(familyMembers),
  elders: many(elders),
  bloodPressureRecords: many(bloodPressureRecords),
  medications: many(medications),
  reminders: many(reminders),
  abnormalEvents: many(abnormalEvents),
  healthReports: many(healthReports),
}));

export const familyMemberRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
  user: one(profiles, {
    fields: [familyMembers.userId],
    references: [profiles.id],
  }),
}));

export const elderRelations = relations(elders, ({ one, many }) => ({
  family: one(families, {
    fields: [elders.familyId],
    references: [families.id],
  }),
  creator: one(profiles, {
    fields: [elders.createdBy],
    references: [profiles.id],
  }),
  bloodPressureRecords: many(bloodPressureRecords),
  medications: many(medications),
  reminders: many(reminders),
  abnormalEvents: many(abnormalEvents),
  healthReports: many(healthReports),
}));

export const bloodPressureRecordRelations = relations(bloodPressureRecords, ({ one, many }) => ({
  family: one(families, {
    fields: [bloodPressureRecords.familyId],
    references: [families.id],
  }),
  elder: one(elders, {
    fields: [bloodPressureRecords.elderId],
    references: [elders.id],
  }),
  recorder: one(profiles, {
    fields: [bloodPressureRecords.recordedBy],
    references: [profiles.id],
  }),
  abnormalEvents: many(abnormalEvents),
}));

export const medicationRelations = relations(medications, ({ one }) => ({
  family: one(families, {
    fields: [medications.familyId],
    references: [families.id],
  }),
  elder: one(elders, {
    fields: [medications.elderId],
    references: [elders.id],
  }),
  creator: one(profiles, {
    fields: [medications.createdBy],
    references: [profiles.id],
  }),
}));

export const reminderRelations = relations(reminders, ({ one }) => ({
  family: one(families, {
    fields: [reminders.familyId],
    references: [families.id],
  }),
  elder: one(elders, {
    fields: [reminders.elderId],
    references: [elders.id],
  }),
  creator: one(profiles, {
    fields: [reminders.createdBy],
    references: [profiles.id],
  }),
}));

export const abnormalEventRelations = relations(abnormalEvents, ({ one }) => ({
  family: one(families, {
    fields: [abnormalEvents.familyId],
    references: [families.id],
  }),
  elder: one(elders, {
    fields: [abnormalEvents.elderId],
    references: [elders.id],
  }),
  creator: one(profiles, {
    fields: [abnormalEvents.createdBy],
    references: [profiles.id],
  }),
  relatedBloodPressureRecord: one(bloodPressureRecords, {
    fields: [abnormalEvents.relatedBloodPressureRecordId],
    references: [bloodPressureRecords.id],
  }),
}));

export const healthReportRelations = relations(healthReports, ({ one }) => ({
  family: one(families, {
    fields: [healthReports.familyId],
    references: [families.id],
  }),
  elder: one(elders, {
    fields: [healthReports.elderId],
    references: [elders.id],
  }),
  generator: one(profiles, {
    fields: [healthReports.generatedBy],
    references: [profiles.id],
  }),
}));
