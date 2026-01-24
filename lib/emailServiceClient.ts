import nodemailer from "nodemailer";
import salonConfig, { getFromEmail } from "@/config/salon.config";
import { getSiteUrl, formatDate, formatTime } from "./emailService";

// Configuration du transporteur Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function signatureHtml() {
  return `
    <p style="color: #666; font-size: 14px;">
      <strong>${salonConfig.identity.name}</strong><br/>
      ${salonConfig.contact.address.street}<br/>
      ${salonConfig.contact.address.postalCode} ${salonConfig.contact.address.city}<br/>
      Tél : <a href="tel:${salonConfig.contact.phone}" style="color: #c4a447; text-decoration: none;">${salonConfig.contact.phone}</a>
    </p>
  `;
}

/**
 * Envoie un email au gérant quand un client annule son RDV
 */
export async function sendClientCancellationToAdmin(data: {
  nom: string
  telephone: string
  email: string
  service: string
  date: string
  heure: string
  staff_member?: string
  appointmentId?: string
}) {
  const adminUrl = data.appointmentId
    ? `${getSiteUrl()}/admin/agenda?appointmentId=${data.appointmentId}`
    : `${getSiteUrl()}/admin/rendezvous`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: salonConfig.admin.email,
    subject: `Annulation - ${data.nom} a annulé son rendez-vous`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Rendez-vous annulé par le client</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 8px 0;"><strong>Client:</strong> ${data.nom}</p>
            <p style="margin: 8px 0;"><strong>Téléphone:</strong> <a href="tel:${data.telephone}">${data.telephone}</a></p>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${data.email || "Non indiqué"}</p>
            <p style="margin: 8px 0;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formatDate(data.date)}</p>
            <p style="margin: 8px 0;"><strong>Heure:</strong> ${formatTime(data.heure)}</p>
            ${data.staff_member ? `<p style="margin: 8px 0;"><strong>Coiffeur:</strong> ${data.staff_member}</p>` : ""}
          </div>

          <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; font-size: 14px;">
              <strong>✗ Annulation client</strong><br/>
              Le client a annulé son rendez-vous depuis le lien de gestion envoyé par email.<br/>
              Le créneau est à nouveau disponible.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Voir l'agenda
            </a>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email au gérant quand un client demande une modification de RDV
 */
export async function sendClientModificationRequestToAdmin(data: {
  nom: string
  telephone: string
  email: string
  service: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
  staff_member?: string
  requiresApproval: boolean
  appointmentId?: string
}) {
  const adminUrl = data.appointmentId
    ? `${getSiteUrl()}/admin/agenda?appointmentId=${data.appointmentId}`
    : `${getSiteUrl()}/admin/rendezvous`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: salonConfig.admin.email,
    subject: data.requiresApproval 
      ? `Demande de modification - ${data.nom}` 
      : `Modification confirmée - ${data.nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${data.requiresApproval ? '#f59e0b' : '#10b981'}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">
            ${data.requiresApproval ? 'Demande de modification' : 'Rendez-vous modifié'}
          </h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 8px 0;"><strong>Client:</strong> ${data.nom}</p>
            <p style="margin: 8px 0;"><strong>Téléphone:</strong> <a href="tel:${data.telephone}">${data.telephone}</a></p>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${data.email || "Non indiqué"}</p>
            <p style="margin: 8px 0;"><strong>Service:</strong> ${data.service}</p>
            ${data.staff_member ? `<p style="margin: 8px 0;"><strong>Coiffeur:</strong> ${data.staff_member}</p>` : ""}
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Ancien créneau :</p>
            <p style="margin: 0;"><strong>Date:</strong> ${formatDate(data.oldDate)}</p>
            <p style="margin: 0;"><strong>Heure:</strong> ${formatTime(data.oldTime)}</p>
          </div>

          <div style="background-color: ${data.requiresApproval ? '#dbeafe' : '#d1fae5'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${data.requiresApproval ? '#3b82f6' : '#10b981'};">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Nouveau créneau :</p>
            <p style="margin: 0;"><strong>Date:</strong> ${formatDate(data.newDate)}</p>
            <p style="margin: 0;"><strong>Heure:</strong> ${formatTime(data.newTime)}</p>
          </div>

          ${data.requiresApproval ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Action requise :</strong><br/>
                Le client souhaite déplacer son rendez-vous. Veuillez accepter ou refuser cette demande depuis votre interface d'administration.
              </p>
            </div>
          ` : `
            <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0; font-size: 14px;">
                <strong>✓ Modification automatique</strong><br/>
                Le rendez-vous a été automatiquement accepté car la validation manuelle est désactivée.<br/>
                Le client a reçu une confirmation par email.
              </p>
            </div>
          `}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Voir dans l'agenda
            </a>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email au client pour confirmer la modification de son RDV (auto-accepté)
 */
export async function sendModificationConfirmedToClient(data: {
  nom: string
  email: string
  service: string
  newDate: string
  newTime: string
  managementUrl: string
}) {
  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: salonConfig.emails.subjects.bookingAccepted || `Modification confirmée - ${salonConfig.identity.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Modification confirmée ✓</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Bonjour <strong>${data.nom}</strong>,
          </p>

          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Votre rendez-vous a été modifié avec succès !
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formatDate(data.newDate)}</p>
            <p style="margin: 8px 0;"><strong>Heure:</strong> ${formatTime(data.newTime)}</p>
          </div>

          <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 14px;">
              <strong>✓ Rendez-vous confirmé</strong><br/>
              Nous vous attendons à la nouvelle date !
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.managementUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
              Gérer mon rendez-vous
            </a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Si vous avez besoin d'annuler ou de modifier à nouveau ce rendez-vous, cliquez sur le bouton ci-dessus.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
            ${signatureHtml()}
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email au client pour l'informer que sa demande de modification est en attente
 */
export async function sendModificationPendingToClient(data: {
  nom: string
  email: string
  service: string
  newDate: string
  newTime: string
}) {
  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: `Demande de modification reçue - ${salonConfig.identity.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f59e0b; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Demande de modification reçue</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Bonjour <strong>${data.nom}</strong>,
          </p>

          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Nous avons bien reçu votre demande de modification de rendez-vous.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 8px 0;"><strong>Nouvelle date souhaitée:</strong> ${formatDate(data.newDate)}</p>
            <p style="margin: 8px 0;"><strong>Nouvelle heure souhaitée:</strong> ${formatTime(data.newTime)}</p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px;">
              <strong>En attente de validation</strong><br/>
              Le salon va examiner votre demande et vous confirmera la modification par email.
            </p>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Nous vous recontacterons dans les plus brefs délais pour confirmer votre nouveau créneau.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
            ${signatureHtml()}
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
