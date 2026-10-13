output "feedback_url" {
  description = "The form posts here: set it as VITE_FEEDBACK_URL in .env.production."
  value       = aws_lambda_function_url.feedback.function_url
}
