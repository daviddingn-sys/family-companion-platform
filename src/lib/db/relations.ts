import { relations } from "drizzle-orm";
import { bloodPressureRecords, elders, families, familyMembers, profiles } from "./schema";

export const profileRelations = relations(profiles, ({ many }) => ({
  ownedFamilies: many(families),
  familyMemberships: many(familyMembers),
  createdElders: many(elders),
  bloodPressureRecords: many(bloodPressureRecords),
}));

export const familyRelations = relations(families, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [families.ownerUserId],
    references: [profiles.id],
  }),
  members: many(familyMembers),
  elders: many(elders),
  bloodPressureRecords: many(bloodPressureRecords),
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
}));

export const bloodPressureRecordRelations = relations(bloodPressureRecords, ({ one }) => ({
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
}));
