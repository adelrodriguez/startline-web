import { alphabet, generateRandomString } from "oslo/crypto"
import {
  batch,
  deleteEmailVerificationCode,
  insertEmailVerificationCode,
  selectEmailVerificationCode,
  updateUser,
  type User,
} from "@/server/db"
import { addHours } from "date-fns"
import { hash, verify } from "@node-rs/argon2"
import { EmailVerificationCodeEmail } from "@/components/emails"
import { sendEmail } from "@/lib/emails"

export async function sendEmailVerificationCode(user: User) {
  // Delete old codes
  await deleteEmailVerificationCode({ userId: user.id })

  const code = await generateRandomString(6, alphabet("0-9", "A-Z"))

  await insertEmailVerificationCode({
    userId: user.id,
    hash: await hash(code),
    expiresAt: addHours(new Date(), 24),
  })

  await sendEmail(
    user.email,
    "Verify email",
    EmailVerificationCodeEmail({ code }),
  )
}

export async function verifyEmailVerificationCode(
  userId: User["id"],
  code: string,
) {
  const emailVerificationCode = await selectEmailVerificationCode({ userId })

  if (!emailVerificationCode) return false

  const isValidCode = await verify(emailVerificationCode.hash, code)

  if (!isValidCode) return false

  await batch([
    updateUser(userId, { emailVerifiedAt: new Date() }),
    deleteEmailVerificationCode({ userId }),
  ])

  return true
}
