terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.location
}

provider "google-beta" {
  project = var.project_id
  region  = var.location
}

variable "project_id" { type = string }
variable "project_number" { type = string }
variable "organization_id" { type = string }
variable "billing_account" { type = string }

variable "location" {
  type    = string
  default = "europe-west4"
}
