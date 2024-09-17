import { relations } from "drizzle-orm"
import {
  account,
  organization,
  organizationInvitation,
  asset,
  password,
  profile,
  user,
  activityLog,
} from "./base"

export const userRelations = relations(user, ({ many, one }) => ({
  password: one(password, {
    fields: [user.id],
    references: [password.userId],
  }),
  accounts: many(account),
  profile: one(profile),
  assets: many(asset),
  activityLogs: many(activityLog),
}))

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  accounts: many(account),
  invitations: many(organizationInvitation),
  activityLogs: many(activityLog),
}))

export const organizationInvitationRelations = relations(
  organizationInvitation,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationInvitation.organizationId],
      references: [organization.id],
    }),
  }),
)

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [account.organizationId],
    references: [organization.id],
  }),
}))

export const assetRelations = relations(asset, ({ one }) => ({
  user: one(user, {
    fields: [asset.userId],
    references: [user.id],
  }),
}))

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  organization: one(organization, {
    fields: [activityLog.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [activityLog.userId],
    references: [user.id],
  }),
}))
