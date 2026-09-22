terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  description = "Region to deploy into. Guardrails must exist in every region you enforce in."
  type        = string
  default     = "eu-west-1"
}

variable "name_prefix" {
  description = "Prefix for resource names."
  type        = string
  default     = "agent-gov"
}

data "aws_caller_identity" "current" {}

# A customer-managed key for the guardrail. Without kms_key_arn the guardrail is
# encrypted with an AWS managed key, which is fine for some data classes and not
# for others. Deciding deliberately is the point.
resource "aws_kms_key" "guardrail" {
  description             = "CMK for the ${var.name_prefix} Bedrock guardrail"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "guardrail" {
  name          = "alias/${var.name_prefix}-guardrail"
  target_key_id = aws_kms_key.guardrail.key_id
}
