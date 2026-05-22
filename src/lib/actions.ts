"use server";

import {
  answerReceptionistQuestion,
  classifyInboundMessage,
  generateCustomerReply,
  generateMissedCallTextBack,
  generateReactivationMessage,
  generateReadyForPickupMessage,
  generateReviewReply,
  generateReviewRequest,
  summarizeDay,
  summarizeIntakeRequest,
} from "@/lib/ai";

export async function runAiAction(task: string, payload: unknown) {
  switch (task) {
    case "summarizeDay":
      return summarizeDay(payload as never);
    case "summarizeIntakeRequest":
      return summarizeIntakeRequest(payload as never);
    case "generateCustomerReply":
      return generateCustomerReply(payload as never);
    case "generateReadyForPickupMessage":
      return generateReadyForPickupMessage(payload as never);
    case "generateReviewRequest":
      return generateReviewRequest(payload as never);
    case "generateReviewReply":
      return generateReviewReply(payload as never);
    case "generateReactivationMessage":
      return generateReactivationMessage(payload as never);
    case "classifyInboundMessage":
      return classifyInboundMessage(payload as never);
    case "generateMissedCallTextBack":
      return generateMissedCallTextBack(payload as never);
    case "answerReceptionistQuestion":
      return answerReceptionistQuestion(payload as never);
    default:
      throw new Error(`Unsupported AI task: ${task}`);
  }
}
