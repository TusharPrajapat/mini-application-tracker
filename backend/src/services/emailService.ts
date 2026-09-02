import fs from "fs";
import path from "path";

export interface SendConfirmationEmailParams {
  applicationId: number;
  candidateEmail: string;
  candidateName?: string;
  jobTitle: string;
}

export interface DurableEmailFailureLog {
  timestamp: string;
  applicationId: number;
  candidateEmail: string;
  jobTitle: string;
  attempt: number;
  error: string;
}

export class EmailService {
  private logFilePath: string;

  constructor() {
    // Path to durable failure log file: backend/logs/email-failures.log
    this.logFilePath = path.join(__dirname, "../../logs/email-failures.log");
  }

  /**
   * Simulated Email Sender Stub:
   * 1. Delays approximately 2 seconds (2000ms) asynchronously.
   * 2. Randomly fails approximately 30% of the time (Math.random() < 0.3).
   * 3. Does NOT block the Node.js event loop.
   */
  async sendApplicationConfirmationEmail(
    params: SendConfirmationEmailParams
  ): Promise<void> {
    // Asynchronous delay ~2 seconds without blocking event loop
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // Simulated 30% failure rate
    if (Math.random() < 0.3) {
      throw new Error("Simulated confirmation email failure");
    }

    console.log(
      `[EmailService] Confirmation email sent successfully to ${params.candidateEmail} for application #${params.applicationId} (${params.jobTitle})`
    );
  }

  /**
   * Durable Failure Logging:
   * Appends failure records to backend/logs/email-failures.log using asynchronous fs.promises APIs.
   * Ensures directory exists and logs JSON Lines structured data.
   */
  async logEmailFailureDurably(entry: DurableEmailFailureLog): Promise<void> {
    try {
      const logDir = path.dirname(this.logFilePath);

      // Create logs directory if it does not exist asynchronously
      await fs.promises.mkdir(logDir, { recursive: true });

      const logLine = JSON.stringify(entry) + "\n";

      // Asynchronous non-blocking file append
      await fs.promises.appendFile(this.logFilePath, logLine, {
        encoding: "utf8",
      });

      console.error(
        `[EmailService] Durable failure logged for application #${entry.applicationId} to ${this.logFilePath}`
      );
    } catch (err) {
      console.error(
        `[EmailService] CRITICAL: Failed to write durable email failure log:`,
        err
      );
    }
  }

  /**
   * 3-Attempt Exponential Backoff Retry Strategy:
   * - Attempt 1: Immediate call (takes ~2s).
   * - Attempt 2 (if Attempt 1 fails): Delay 1s, retry sender (~2s).
   * - Attempt 3 (if Attempt 2 fails): Delay 2s, retry sender (~2s).
   * - If Attempt 3 fails: Durably log the failure to backend/logs/email-failures.log.
   */
  async sendConfirmationEmailWithRetry(
    params: SendConfirmationEmailParams
  ): Promise<void> {
    const maxAttempts = 3;
    const backoffDelays = [0, 1000, 2000]; // Delays before attempt 1, attempt 2, attempt 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const delay = backoffDelays[attempt - 1];
        if (delay > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }

        console.log(
          `[EmailService] Attempting to send confirmation email (Attempt ${attempt}/${maxAttempts}) for application #${params.applicationId}...`
        );

        await this.sendApplicationConfirmationEmail(params);
        return; // Success -> Exit loop
      } catch (error) {
        const err = error as Error;
        console.warn(
          `[EmailService] Attempt ${attempt}/${maxAttempts} failed for application #${params.applicationId}: ${err.message}`
        );

        // If final attempt failed, log durably
        if (attempt === maxAttempts) {
          const logEntry: DurableEmailFailureLog = {
            timestamp: new Date().toISOString(),
            applicationId: params.applicationId,
            candidateEmail: params.candidateEmail,
            jobTitle: params.jobTitle,
            attempt: maxAttempts,
            error: err.message,
          };

          await this.logEmailFailureDurably(logEntry);
        }
      }
    }
  }
}

export const emailService = new EmailService();
