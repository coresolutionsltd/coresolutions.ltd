---
title: "Up and Running with the Cloudflare Terraform Provider"
description: "Quick start guide to managing Cloudflare infrastructure with Terraform"
pubDate: 2025-09-26
author: "Billy"
cardImage: "@/images/blog/cloudflare-terraform-provider.jpg"
cardImageAlt: "Cloudflare and Terraform integration illustration"
readTime: 4
tags: ["terraform", "opentofu", "cloudflare", "infrastructure", "dns", "cdn"]
---

The Cloudflare Terraform provider enables you to manage your Cloudflare resources using Infrastructure as Code principles. By storing your configuration in version control, you gain auditable changes, easy rollbacks, and the ability to use the same refined processes you already have for your cloud infrastructure.

## Authentication and Setup

Modern authentication with the Cloudflare provider uses **API tokens** instead of the legacy API keys. API tokens are more secure and can be scoped to specific resources and permissions.

**Creating an API Token**

1. Go to your Cloudflare dashboard → My Profile → API Tokens
2. Click "Create Token"
3. Use a preset template or create a custom token with specific permissions
4. Copy the generated token securely

**Provider Configuration**

The recommended approach is to use environment variables for security:

```bash
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  # API token will be read from CLOUDFLARE_API_TOKEN environment variable
  # Or specify directly: api_token = "your-token-here"
}
```

For AWS Secrets Manager integration:

```hcl
data "aws_secretsmanager_secret_version" "cloudflare_token" {
  secret_id = "cloudflare/api_token"
}

locals {
  cloudflare_secrets = jsondecode(data.aws_secretsmanager_secret_version.cloudflare_token.secret_string)
}

provider "cloudflare" {
  api_token = local.cloudflare_secrets.api_token
}
```

## Managing DNS and Zones

**Zones**

Create and manage DNS zones:

```hcl
resource "cloudflare_zone" "example" {
  zone = "example.com"
  plan = "free" # or "pro", "business", "enterprise"
  type = "full" # or "partial" for CNAME setup
}

# Configure zone settings
resource "cloudflare_zone_settings_override" "example" {
  zone_id = cloudflare_zone.example.id

  settings {
    always_online            = "on"
    automatic_https_rewrites = "on"
    brotli                  = "on"
    browser_cache_ttl       = 14400
    challenge_ttl           = 2700
    development_mode        = "off"
    minify {
      css  = "on"
      html = "on"
      js   = "on"
    }
    security_level = "medium"
    ssl           = "strict"
  }
}
```

**DNS Records**

Manage DNS records with various types:

```hcl
# A record
resource "cloudflare_record" "www" {
  zone_id = cloudflare_zone.example.id
  name    = "www"
  value   = "192.0.2.1"
  type    = "A"
  proxied = true
  ttl     = 1 # TTL must be 1 when proxied
}

# CNAME record
resource "cloudflare_record" "blog" {
  zone_id = cloudflare_zone.example.id
  name    = "blog"
  value   = "example.github.io"
  type    = "CNAME"
  proxied = false
  ttl     = 3600
}

# MX record
resource "cloudflare_record" "mx" {
  zone_id  = cloudflare_zone.example.id
  name     = "@"
  value    = "mail.example.com"
  type     = "MX"
  priority = 10
  ttl      = 3600
}
```

## Performance and Caching

**Page Rules**

Create page rules for custom behavior:

```hcl
resource "cloudflare_page_rule" "static_cache" {
  zone_id  = cloudflare_zone.example.id
  target   = "static.example.com/*"
  priority = 1
  status   = "active"

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 86400
  }
}
```

## Security Configuration

**Security Rules**

Configure WAF and firewall rules:

```hcl
# Firewall rule
resource "cloudflare_ruleset" "firewall" {
  zone_id = cloudflare_zone.example.id
  name    = "Block bad bots"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(cf.threat_score gt 14)"
    description = "Block requests with high threat score"
    enabled = true
  }
}
```

## Edge Computing with Workers

**Worker Scripts and Routes**

Deploy Cloudflare Workers:

```hcl
resource "cloudflare_worker_script" "example" {
  account_id = "023e105f4ecef8ad9ca31a8372d0c353" # Replace with your account ID
  name       = "example-worker"
  content    = file("${path.module}/worker.js")

  # Optional: Add environment variables
  plain_text_binding {
    name = "API_URL"
    text = "https://api.example.com"
  }
}

resource "cloudflare_worker_route" "example" {
  zone_id     = cloudflare_zone.example.id
  pattern     = "api.example.com/*"
  script_name = cloudflare_worker_script.example.name
}
```

## Working with Existing Resources

**Data Sources**

Use data sources to reference existing resources:

```hcl
# Reference existing zone
data "cloudflare_zones" "example" {
  filter {
    name = "example.com"
  }
}

# Reference IP ranges
data "cloudflare_ip_ranges" "cloudflare" {}

# Use in security group rules
resource "aws_security_group_rule" "cloudflare_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = data.cloudflare_ip_ranges.cloudflare.ipv4_cidr_blocks
  security_group_id = aws_security_group.web.id
}
```

## Implementation Best Practices

1. **Use API tokens** instead of legacy API keys for better security
2. **Store credentials securely** using environment variables or secret management
3. **Version your provider** to ensure consistent behavior
4. **Use data sources** to reference existing resources rather than hardcoding IDs
5. **Enable proxying** for A/AAAA/CNAME records to leverage Cloudflare's CDN
6. **Set appropriate TTL values** based on your use case (shorter for dynamic content)

## Conclusion

The Cloudflare Terraform provider offers comprehensive management of your Cloudflare infrastructure. With modern API token authentication, extensive resource coverage, and excellent integration with existing Terraform workflows, you can confidently manage DNS, security, performance, and edge computing resources as code.

Start with the basics—zones and records—then expand to leverage Cloudflare's advanced features like Workers, security rules, and performance optimizations as your needs grow.
