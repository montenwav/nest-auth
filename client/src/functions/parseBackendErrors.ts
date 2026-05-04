export function parseBackendErrors(messages: string[]) {
  const fieldErrors: any = {};

  messages.forEach((msg) => {
    const lowerMsg = msg.toLowerCase();

    if (lowerMsg.includes("full") || lowerMsg.includes("name")) {
      fieldErrors.fullname = msg;
    } else if (lowerMsg.includes("email")) {
      fieldErrors.email = msg;
    } else if (lowerMsg.includes("password")) {
      fieldErrors.password = msg;
    } else if (lowerMsg.includes("confirm")) {
      fieldErrors.confirmPassword = msg;
    } else {
      fieldErrors.general = msg;
    }
  });

  return fieldErrors;
}
