import nodemailer from "nodemailer";
import salonConfig, { getFromEmail } from "@/config/salon.config";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Configuration du transporteur Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface RendezVousData {
  nom: string;
  telephone: string;
  email?: string;
  service: string;
  date: string;
  heure: string;
  message?: string;
}

interface AcceptanceEmailData {
  nom: string;
  email: string;
  service: string;
  date: string;
  heure: string;
}

interface RejectionEmailData {
  nom: string;
  email: string;
}

interface CancellationEmailData {
  nom: string;
  email: string;
  service: string;
  date: string;
  heure: string;
}

interface ReviewRequestData {
  nom: string;
  email: string;
  service: string;
  date: string;
}

interface RescheduleRequestData {
  nom: string;
  email: string;
  service: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  rdvId: string;
}

interface RescheduleConfirmationData {
  nom: string;
  email: string;
  service: string;
  date: string;
  heure: string;
}

interface RescheduleCancelledData {
  nom: string;
  email: string;
  service: string;
  date: string;
  heure: string;
}

interface ExceptionalClosureData {
  nom: string;
  email: string;
  service: string;
  date: string;
  heure: string;
  reason: string;
}


function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Formate une heure au format français : 10h30
 * @param time - Heure au format HH:mm ou HH:mm:ss
 */
function formatTime(time: string): string {
  if (!time) return '';
  // Extraire HH:mm depuis HH:mm ou HH:mm:ss
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}h${parts[1]}`;
  }
  return time;
}

/**
 * Formate une date au format français : Mercredi 24 décembre 2025
 * @param date - Date au format YYYY-MM-DD ou objet Date
 */
function formatDate(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    
    // Formater en français avec date-fns
    const formatted = format(dateObj, 'EEEE d MMMM yyyy', { locale: fr });
    
    // Capitaliser la première lettre
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (error) {
    console.error('Erreur formatage date:', error);
    return date.toString();
  }
}

function signatureHtml() {
  return `
    <p style="font-size: 13px; color: #666; margin: 5px 0;">
      <strong>${salonConfig.identity.name}</strong><br/>
      ${salonConfig.contact.address.full}<br/>
      <a href="tel:${salonConfig.contact.phoneLink}" style="color: #c4a447; text-decoration: none;">
        Tél: ${salonConfig.contact.phoneDisplay}
      </a>
    </p>
  `;
}

/**
 * Envoie un email de notification à l'admin (en français)
 */
export async function sendEmailToPatricia(data: RendezVousData) {
  const adminUrl = `${getSiteUrl()}/admin/rendezvous`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: salonConfig.admin.email,
    subject: salonConfig.emails.subjects.newBooking.replace("{{clientName}}", data.nom),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #c4a447; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Nouvelle demande de rendez-vous</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 8px 0;"><strong>Nom:</strong> ${data.nom}</p>
            <p style="margin: 8px 0;"><strong>Téléphone:</strong> <a href="tel:${data.telephone}">${data.telephone}</a></p>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${data.email || "Non indiqué"}</p>
            <p style="margin: 8px 0;"><strong>Service:</strong> ${data.service}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formatDate(data.date)}</p>
            <p style="margin: 8px 0;"><strong>Heure:</strong> ${formatTime(data.heure)}</p>
            ${data.message ? `<p style="margin: 8px 0;"><strong>Message:</strong> ${data.message}</p>` : ""}
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Action requise :</strong><br/>
              Cette demande est en attente de votre validation.<br/>
              Le client sera notifié par email une fois que vous aurez accepté ou refusé le rendez-vous.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Accéder au panel d'administration
            </a>
          </div>

          <p style="font-size: 13px; color: #666; text-align: center;">
            Cliquez sur le bouton ci-dessus pour vous connecter et gérer cette demande.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email de confirmation au client (demande reçue)
 */
export async function sendConfirmationToClient(data: RendezVousData) {
  if (!data.email) return;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: salonConfig.emails.subjects.clientConfirmation,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #c4a447; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">${salonConfig.identity.name}</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Votre demande de rendez-vous au <strong>${salonConfig.identity.name}</strong> a bien été reçue.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c4a447;">
            <p style="margin: 8px 0;"><strong>Service :</strong> ${data.service}</p>
            <p style="margin: 8px 0;"><strong>Date souhaitée :</strong> ${formatDate(data.date)}</p>
            <p style="margin: 8px 0;"><strong>Heure souhaitée :</strong> ${formatTime(data.heure)}</p>
          </div>

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Important :</strong><br/>
              Votre rendez-vous sera confirmé une fois validé par notre équipe.<br/>
              Vous recevrez un email de confirmation définitive sous peu.
            </p>
          </div>

          <p style="font-size: 16px;">
            Merci pour votre confiance ! Nous avons hâte de vous accueillir.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            ${signatureHtml()}
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email d'acceptation au client (rdv confirmé)
 */
export async function sendAcceptanceEmail(data: AcceptanceEmailData) {
  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: salonConfig.emails.subjects.bookingAccepted,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #c4a447; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Rendez-vous confirmé</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Excellente nouvelle ! Votre rendez-vous au <strong>${salonConfig.identity.name}</strong> est confirmé.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c4a447;">
            <p style="margin: 8px 0;"><strong>Date :</strong> ${formatDate(data.date)}</p>
            <p style="margin: 8px 0;"><strong>Heure :</strong> ${formatTime(data.heure)}</p>
            <p style="margin: 8px 0;"><strong>Service :</strong> ${data.service}</p>
          </div>

          <p style="font-size: 14px; color: #666;">
            Nous vous attendons avec plaisir ! En cas d'empêchement, merci de nous prévenir au plus tôt.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            ${signatureHtml()}
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email de refus au client
 */
export async function sendRejectionEmail(data: RejectionEmailData) {
  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: salonConfig.emails.subjects.bookingRejected || "Votre demande de rendez-vous",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #666; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">${salonConfig.identity.name}</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Merci pour votre demande de rendez-vous au ${salonConfig.identity.name}.
          </p>

          <p style="font-size: 16px;">
            Malheureusement, le créneau horaire que vous avez demandé n'est pas disponible.
          </p>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Nous vous invitons à :</strong><br/>
              • Proposer un autre créneau via notre site<br/>
              • Nous contacter directement par téléphone
            </p>
          </div>

          <p style="font-size: 14px; color: #666;">
            Nous espérons pouvoir vous accueillir très prochainement dans notre salon.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            ${signatureHtml()}
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email d'annulation au client
 */
export async function sendCancellationEmail(data: CancellationEmailData) {
  const bookingUrl = `${getSiteUrl()}/rendezvous`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: "Annulation de votre rendez-vous",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">${salonConfig.identity.name}</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Nous vous informons que votre rendez-vous au <strong>${salonConfig.identity.name}</strong> a été annulé.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p style="margin: 8px 0;"><strong>Service :</strong> ${data.service}</p>
            <p style="margin: 8px 0;"><strong>Date :</strong> ${formatDate(data.date)}</p>
            <p style="margin: 8px 0;"><strong>Heure :</strong> ${formatTime(data.heure)}</p>
          </div>

          <p style="font-size: 16px;">
            Nous nous excusons pour la gêne occasionnée.
          </p>

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Vous souhaitez reprendre rendez-vous ?</strong><br/>
              N'hésitez pas à réserver un nouveau créneau directement en ligne ou à nous contacter par téléphone.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Prendre un nouveau rendez-vous
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Pour toute question, n'hésitez pas à nous contacter.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            ${signatureHtml()}
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email de demande d'avis Google après le rendez-vous
 */
export async function sendReviewRequestEmail(data: ReviewRequestData) {
  const googleReviewUrl = salonConfig.google.reviewUrl;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: salonConfig.emails.subjects.reviewRequest || "Comment s'est passé votre rendez-vous ?",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #c4a447; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Merci pour votre visite !</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Nous espérons que votre rendez-vous du <strong>${formatDate(data.date)}</strong> pour <strong>${data.service}</strong>
            s'est bien passé et que vous êtes satisfait(e) de votre nouvelle coiffure !
          </p>

          <div style="background-color: #fff9e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c4a447;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">
              <strong>Votre avis compte pour nous !</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              Si vous avez apprécié notre service, nous serions ravis que vous partagiez votre expérience
              en laissant un avis sur Google. Cela nous aide énormément à faire découvrir notre salon.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${googleReviewUrl}" style="display: inline-block; background-color: #4285F4; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Laisser un avis Google
            </a>
          </div>

          <p style="font-size: 14px; color: #666; text-align: center;">
            Merci pour votre confiance et à très bientôt au salon !
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
 * Envoie un email au client pour l'informer du changement de rendez-vous
 */
export async function sendRescheduleEmail(data: RescheduleRequestData) {
  const siteUrl = getSiteUrl();
  const validationUrl = `${siteUrl}/rendezvous/reschedule?id=${data.rdvId}&validate=reschedule`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: `${salonConfig.identity.name} - Modification de votre rendez-vous`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #c4a447; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Modification de rendez-vous</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Nous avons besoin de déplacer votre rendez-vous pour <strong>${data.service}</strong>.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0; text-decoration: line-through; color: #999;">
              <strong>Rendez-vous initial :</strong><br/>
              ${formatDate(data.oldDate)} à ${formatTime(data.oldTime)}
            </p>
            <p style="margin: 8px 0; color: #c4a447; font-weight: bold;">
              <strong>Nouveau créneau proposé :</strong><br/>
              ${formatDate(data.newDate)} à ${formatTime(data.newTime)}
            </p>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Merci de confirmer :</strong><br/>
              Veuillez cliquer sur le bouton ci-dessous pour valider ce nouveau créneau.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${validationUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Confirmer le nouveau créneau
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Si ce nouveau créneau ne vous convient pas, vous pouvez refuser et prendre un nouveau rendez-vous directement sur le lien ci-dessus.
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
 * Envoie un email à l'admin quand un client accepte une modification de rendez-vous
 */
export async function sendRescheduleAcceptedToAdmin(data: RescheduleConfirmationData) {
  const adminUrl = `${getSiteUrl()}/admin/rendezvous`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: salonConfig.admin.email,
    subject: `Modification acceptée - ${data.nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Modification de rendez-vous acceptée</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">
            <strong>${data.nom}</strong> a accepté la modification de rendez-vous.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 8px 0;"><strong>Client :</strong> ${data.nom}</p>
            <p style="margin: 8px 0;"><strong>Email :</strong> ${data.email}</p>
            <p style="margin: 8px 0;"><strong>Service :</strong> ${data.service}</p>
            <p style="margin: 8px 0; color: #28a745; font-weight: bold;">
              <strong>Nouveau rendez-vous :</strong><br/>
              ${formatDate(data.date)} à ${formatTime(data.heure)}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Voir dans l'administration
            </a>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Envoie un email de confirmation après acceptation du reschedule
 */
export async function sendRescheduleConfirmationEmail(data: RescheduleConfirmationData) {
  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: `${salonConfig.identity.name} - Rendez-vous confirmé`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">✓ Rendez-vous confirmé !</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Merci d'avoir accepté le nouveau créneau. Votre rendez-vous a été modifié avec succès.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 8px 0; font-size: 18px;">
              <strong>Votre nouveau rendez-vous :</strong>
            </p>
            <p style="margin: 8px 0; color: #c4a447; font-size: 20px; font-weight: bold;">
              ${formatDate(data.date)} à ${formatTime(data.heure)}
            </p>
            <p style="margin: 8px 0; color: #666;">
              ${data.service}
            </p>
          </div>

          <p style="font-size: 14px; color: #666;">
            Nous vous attendons avec plaisir !
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
 * Envoie un email d'annulation après refus du reschedule
 */
export async function sendRescheduleCancelledEmail(data: RescheduleCancelledData) {
  const siteUrl = getSiteUrl();
  const bookingUrl = `${siteUrl}/rendezvous`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: `${salonConfig.identity.name} - Rendez-vous annulé`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #6c757d; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Rendez-vous annulé</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Suite à votre refus du nouveau créneau proposé, votre rendez-vous a été annulé.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0; text-decoration: line-through; color: #999;">
              ${formatDate(data.date)} à ${formatTime(data.heure)}<br/>
              ${data.service}
            </p>
          </div>

          <p style="font-size: 16px;">
            Nous serions ravis de vous accueillir prochainement. Vous pouvez reprendre un rendez-vous à tout moment :
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Prendre un nouveau rendez-vous
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Pour toute question, n'hésitez pas à nous contacter.
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
 * Envoie un email d'annulation suite à une fermeture exceptionnelle
 */
export async function sendExceptionalClosureEmail(data: ExceptionalClosureData) {
  const siteUrl = getSiteUrl();
  const bookingUrl = `${siteUrl}/rendezvous`;

  const mailOptions = {
    from: getFromEmail(),
    replyTo: salonConfig.emails.replyTo,
    to: data.email,
    subject: `${salonConfig.identity.name} - Annulation de votre rendez-vous`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Annulation de rendez-vous</h2>
        </div>

        <div style="background-color: #f6f2ec; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px;">Bonjour <strong>${data.nom}</strong>,</p>

          <p style="font-size: 16px;">
            Nous sommes au regret de vous informer que votre rendez-vous doit être annulé en raison de : <strong>${data.reason}</strong>
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p style="margin: 8px 0;"><strong>Rendez-vous annulé :</strong></p>
            <p style="margin: 8px 0; text-decoration: line-through; color: #999;">
              ${formatDate(data.date)} à ${formatTime(data.heure)}<br/>
              ${data.service}
            </p>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Nous nous excusons pour ce désagrément.</strong><br/>
              Nous vous invitons à reprendre rendez-vous dès que possible pour une autre date.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background-color: #c4a447; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Prendre un nouveau rendez-vous
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Pour toute question, n'hésitez pas à nous contacter directement.
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
