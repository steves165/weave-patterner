/**
 * The feedback endpoint's kill switch (infra/feedback/main.tf): when the alarm on its request count goes off, sets the
 * feedback function's concurrency to 0, so nothing more can run it (and nothing more can cost anything) until
 * `terraform apply` sets it back to 1.
 */
import { LambdaClient, PutFunctionConcurrencyCommand } from '@aws-sdk/client-lambda'

export async function handler(event) {
  for (const record of event.Records ?? []) {
    const alarm = JSON.parse(record.Sns?.Message ?? '{}')
    if (alarm.NewStateValue !== 'ALARM') continue
    await new LambdaClient({}).send(
      new PutFunctionConcurrencyCommand({
        FunctionName: process.env.FUNCTION_NAME,
        ReservedConcurrentExecutions: 0,
      }),
    )
    console.log(`Turned ${process.env.FUNCTION_NAME} off: ${alarm.NewStateReason}`)
  }
}
