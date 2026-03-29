const Notification = require("../models/Notification");
const { sendEmail, emailTemplates } = require("./emailService");
const User = require("../models/User");

// In-memory store for Socket.IO instance
let io = null;

function setSocketIO(socketIO) {
  io = socketIO;
}

/**
 * Creates a notification, sends real-time via Socket.IO, and optionally sends email.
 */
async function notify({ userId, type, title, message, link, metadata, sendMail, emailData }) {
  try {
    // Save to DB
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      metadata,
    });

    // Emit via Socket.IO if available
    if (io) {
      io.to(`user:${userId}`).emit("notification", {
        _id: notification._id,
        type,
        title,
        message,
        link,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    // Send email if requested
    if (sendMail && emailData) {
      const user = await User.findById(userId).select("email");
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: emailData.subject,
          html: emailData.html,
        });
      }
    }

    return notification;
  } catch (err) {
    console.error("[NOTIFY] Error:", err.message);
    return null;
  }
}

// Pre-built notification helpers
async function notifyApplicationStatus(userId, studentName, jobTitle, companyName, newStatus) {
  const email = emailTemplates.applicationStatusChange(studentName, jobTitle, companyName, newStatus);
  return notify({
    userId,
    type: "APPLICATION_STATUS",
    title: `Application Update: ${jobTitle}`,
    message: `Your application for ${jobTitle} at ${companyName} has been updated to: ${newStatus}`,
    link: "/student/applications",
    sendMail: true,
    emailData: email,
  });
}

async function notifyInterviewScheduled(userId, studentName, jobTitle, date, mode, link) {
  const email = emailTemplates.interviewScheduled(studentName, jobTitle, date, mode, link);
  return notify({
    userId,
    type: "INTERVIEW_SCHEDULED",
    title: `Interview Scheduled: ${jobTitle}`,
    message: `Your interview is on ${new Date(date).toLocaleDateString()} (${mode})`,
    link: "/student/interviews",
    sendMail: true,
    emailData: email,
  });
}

async function notifyInterviewSlotsOpened(userId, studentName, jobTitle, slotCount, applicationId) {
  const email = emailTemplates.interviewSlotsPublished(studentName, jobTitle, slotCount);
  return notify({
    userId,
    type: "INTERVIEW_SLOT_OPENED",
    title: `Interview Slots Available: ${jobTitle}`,
    message: `${slotCount} interview slot(s) are available. Book your preferred time.`,
    link: "/student/interviews",
    metadata: { applicationId, slotCount },
    sendMail: true,
    emailData: email,
  });
}

async function notifyInterviewSlotBooked(userId, recruiterName, jobTitle, candidateName, date, mode, applicationId) {
  const email = emailTemplates.interviewSlotBooked(recruiterName, jobTitle, candidateName, date, mode);
  return notify({
    userId,
    type: "INTERVIEW_SLOT_BOOKED",
    title: `Slot Booked: ${jobTitle}`,
    message: `${candidateName} booked an interview slot on ${new Date(date).toLocaleDateString()}.`,
    link: "/recruiter/applications",
    metadata: { applicationId, candidateName, date, mode },
    sendMail: true,
    emailData: email,
  });
}

async function notifyRecruiterApproved(userId, name) {
  const email = emailTemplates.recruiterApproved(name);
  return notify({
    userId,
    type: "RECRUITER_APPROVED",
    title: "Account Approved!",
    message: "Your recruiter account has been approved. You can now post jobs.",
    link: "/recruiter/dashboard",
    sendMail: true,
    emailData: email,
  });
}

async function notifyOfferReceived(userId, jobTitle, companyName) {
  return notify({
    userId,
    type: "OFFER_RECEIVED",
    title: `Offer Received: ${jobTitle}`,
    message: `You've received an offer for ${jobTitle} at ${companyName}!`,
    link: "/student/applications",
    sendMail: false,
  });
}

async function notifyTicketAnswered(userId, ticketId) {
  return notify({
    userId,
    type: "TICKET_ANSWERED",
    title: "Support Ticket Answered",
    message: "Your support ticket has been responded to by an admin.",
    link: "/student/support",
    sendMail: false,
  });
}

module.exports = {
  setSocketIO,
  notify,
  notifyApplicationStatus,
  notifyInterviewScheduled,
  notifyInterviewSlotsOpened,
  notifyInterviewSlotBooked,
  notifyRecruiterApproved,
  notifyOfferReceived,
  notifyTicketAnswered,
};
