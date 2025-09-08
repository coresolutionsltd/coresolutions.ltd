---
title: "Testing OpenTofu / Terraform"
description: "Explore tools and strategies for integrating robust testing into your OpenTofu/Terraform workflows."
pubDate: 2025-09-01
author: "Billy"
cardImage: "@/images/blog/testing-opentofu-terraform.jpg"
cardImageAlt: "Testing OpenTofu/Terraform"
readTime: 5
tags: ["testing", "opentofu", "terraform"]
---

Infrastructure as Code (IaC) has revolutionised how we manage and deploy infrastructure, but with that power comes the need for robust testing strategies. Both OpenTofu and Terraform now provide native testing frameworks that eliminate the need for external testing tools like Terratest for many use cases. This guide explores practical testing approaches that work seamlessly across both platforms.

## The Evolution of Infrastructure Testing

The infrastructure testing landscape has matured significantly. Terraform 1.6 introduced a powerful new testing framework that became generally available, and OpenTofu has maintained compatibility with this testing approach, allowing teams to write tests in HCL rather than learning additional languages like Go.

## Why Native Testing Matters

Traditional testing approaches often required:
- Learning additional programming languages (Go for Terratest, Python for other frameworks)
- Complex setup and teardown procedures
- External dependencies and toolchain management
- Separate CI/CD pipeline considerations

The native testing framework addresses these challenges by providing:
- Tests written in the same HCL language you already know
- Built-in state management and cleanup
- Integrated plan and apply testing modes
- Cross-platform compatibility between OpenTofu and Terraform

## Getting Started: Your First Test

Let's start with a practical example. Consider this simple infrastructure module that creates an S3 bucket with specific naming conventions:

```hcl
# main.tf
variable "environment" {
  description = "The environment name"
  type        = string
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "The project name"
  type        = string
  
  validation {
    condition     = length(var.project_name) > 2 && length(var.project_name) < 20
    error_message = "Project name must be between 3 and 19 characters."
  }
}

resource "aws_s3_bucket" "main" {
  bucket = "${var.project_name}-${var.environment}-data"
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.environment == "prod" ? "Enabled" : "Suspended"
  }
}

output "bucket_name" {
  description = "The name of the created S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "versioning_enabled" {
  description = "Whether versioning is enabled"
  value       = aws_s3_bucket_versioning.main.versioning_configuration[0].status == "Enabled"
}
```

Now let's create comprehensive tests for this module:

```hcl
# tests/bucket_naming.tftest.hcl
variables {
  environment  = "dev"
  project_name = "myapp"
}

run "valid_bucket_naming" {
  command = plan
  
  assert {
    condition     = aws_s3_bucket.main.bucket == "myapp-dev-data"
    error_message = "Bucket name should follow pattern: project-environment-data"
  }
}

run "versioning_disabled_for_dev" {
  command = plan
  
  variables {
    environment = "dev"
    project_name = "testproject"
  }
  
  assert {
    condition     = aws_s3_bucket_versioning.main.versioning_configuration[0].status == "Suspended"
    error_message = "Versioning should be disabled for dev environment"
  }
}

run "versioning_enabled_for_prod" {
  command = plan
  
  variables {
    environment = "prod"
    project_name = "testproject"
  }
  
  assert {
    condition     = aws_s3_bucket_versioning.main.versioning_configuration[0].status == "Enabled"
    error_message = "Versioning should be enabled for prod environment"
  }
}
```

## Testing Validation Logic

One of the most powerful aspects of the native testing framework is the ability to test validation failures:

```hcl
# tests/validation.tftest.hcl
run "invalid_environment_fails" {
  command = plan
  
  variables {
    environment  = "invalid"
    project_name = "myapp"
  }
  
  expect_failures = [
    var.environment,
  ]
}

run "project_name_too_short_fails" {
  command = plan
  
  variables {
    environment  = "dev"
    project_name = "xy"
  }
  
  expect_failures = [
    var.project_name,
  ]
}

run "project_name_too_long_fails" {
  command = plan
  
  variables {
    environment  = "dev" 
    project_name = "this-name-is-way-too-long-for-our-validation"
  }
  
  expect_failures = [
    var.project_name,
  ]
}
```

## Advanced Testing: Mocking and Overrides

For complex infrastructure that you don't want to actually deploy during testing, both OpenTofu and Terraform support mocking and resource overrides:

```hcl
# tests/integration.tftest.hcl
# Mock the AWS provider to avoid actual resource creation
mock_provider "aws" {
  alias = "mock"
}

run "integration_test_with_mocks" {
  providers = {
    aws = aws.mock
  }
  
  variables {
    environment  = "prod"
    project_name = "integration-test"
  }
  
  assert {
    condition     = aws_s3_bucket.main.bucket == "integration-test-prod-data"
    error_message = "Bucket naming integration failed"
  }
  
  assert {
    condition     = output.versioning_enabled == true
    error_message = "Prod environment should have versioning enabled"
  }
}

# Override specific resources for testing edge cases
run "test_with_overrides" {
  override_resource {
    target = aws_s3_bucket_versioning.main
    values = {
      versioning_configuration = [{
        status = "Enabled"
      }]
    }
  }
  
  variables {
    environment  = "dev"
    project_name = "override-test"
  }
  
  assert {
    condition     = output.versioning_enabled == true
    error_message = "Override should force versioning to be enabled"
  }
}
```

## Testing with Helper Modules

Sometimes you need additional resources for testing that aren't part of your main module. The native framework supports this through helper modules:

```hcl
# test-helpers/http-check/main.tf
variable "bucket_name" {
  description = "Bucket name to check"
  type        = string
}

# Load the main module being tested
module "main" {
  source = "../../"
  
  environment  = var.environment
  project_name = var.project_name
}

# Add test-specific resources
data "aws_s3_bucket" "test_check" {
  bucket = module.main.bucket_name
  depends_on = [module.main]
}

output "bucket_exists" {
  value = data.aws_s3_bucket.test_check.id != ""
}

output "main_outputs" {
  value = {
    bucket_name        = module.main.bucket_name
    versioning_enabled = module.main.versioning_enabled
  }
}
```

```hcl
# tests/existence_check.tftest.hcl
variables {
  environment  = "dev"
  project_name = "existence-test"
}

run "bucket_actually_exists" {
  module {
    source = "./test-helpers/http-check"
  }
  
  assert {
    condition     = output.bucket_exists == true
    error_message = "Bucket should exist after creation"
  }
  
  assert {
    condition     = output.main_outputs.bucket_name == "existence-test-dev-data"
    error_message = "Helper module should pass through correct bucket name"
  }
}
```

## Testing Strategies: Unit vs Integration

### Unit Testing (Plan Mode)
Use `command = plan` for fast feedback on configuration logic:

```hcl
run "unit_test_bucket_config" {
  command = plan
  
  # Fast execution, no real resources created
  assert {
    condition = aws_s3_bucket.main.bucket != ""
    error_message = "Bucket name must not be empty"
  }
}
```

### Integration Testing (Apply Mode)
Use the default `command = apply` for end-to-end validation:

```hcl
run "integration_test_full_stack" {
  # This will actually create and destroy resources
  variables {
    environment = "dev"
    project_name = "integration"
  }
  
  assert {
    condition = aws_s3_bucket.main.id != ""
    error_message = "Bucket should be successfully created"
  }
}
```

## Cross-Platform Compatibility

Both OpenTofu and Terraform support the same testing syntax, but there are subtle differences to be aware of:

### File Extensions
- **Terraform**: Uses `.tftest.hcl` and `.tftest.json`
- **OpenTofu**: Supports both `.tftest.hcl`/`.tftest.json` AND `.tofutest.hcl`/`.tofutest.json`
- **Best Practice**: Stick with `.tftest.hcl` for maximum compatibility

### Running Tests
```bash
# Terraform
terraform test

# OpenTofu  
tofu test

# Both support the same options
terraform test -filter=specific_test.tftest.hcl
tofu test -filter=specific_test.tftest.hcl
```

## Organizing Your Test Suite

### Directory Structure Options

**Option 1: Co-located Tests**
```
.
├── main.tf
├── variables.tf
├── outputs.tf
├── basic_functionality.tftest.hcl
├── validation_rules.tftest.hcl
└── integration_tests.tftest.hcl
```

**Option 2: Separate Tests Directory**
```
.
├── main.tf
├── variables.tf
├── outputs.tf
└── tests/
    ├── basic_functionality.tftest.hcl
    ├── validation_rules.tftest.hcl
    ├── integration_tests.tftest.hcl
    └── helpers/
        └── test-setup/
```

### Test Naming Conventions

Use descriptive names that indicate the test purpose:
- `validation_*.tftest.hcl` - Tests for input validation
- `unit_*.tftest.hcl` - Fast unit tests using plan mode
- `integration_*.tftest.hcl` - Full integration tests
- `edge_case_*.tftest.hcl` - Tests for unusual scenarios

## Best Practices and Recommendations

### 1. Layer Your Testing Strategy
- **Validation Tests**: Test input validation and constraints
- **Unit Tests**: Test configuration logic using plan mode
- **Integration Tests**: Test real resource creation selectively
- **Smoke Tests**: Quick health checks for critical functionality

### 2. Use Mocks Strategically
Don't mock everything - use mocks for:
- Expensive resources (large compute instances)
- Resources with external dependencies
- Third-party services that don't need actual validation

### 3. Test Both Success and Failure Paths
```hcl
run "valid_input_succeeds" {
  variables {
    environment = "prod"
  }
  
  assert {
    condition = aws_s3_bucket.main.id != ""
    error_message = "Valid input should create bucket"
  }
}

run "invalid_input_fails" {
  variables {
    environment = "invalid"
  }
  
  expect_failures = [var.environment]
}
```

### 4. Keep Tests Independent
Each `run` block should be independent and not rely on state from other tests:

```hcl
# Good - each test is self-contained
run "test_dev_environment" {
  variables {
    environment = "dev"
    project_name = "test-dev"
  }
  # ... assertions
}

run "test_prod_environment" {
  variables {
    environment = "prod"
    project_name = "test-prod"  
  }
  # ... assertions
}
```

### 5. Use Descriptive Error Messages
```hcl
assert {
  condition = length(aws_s3_bucket.main.bucket) <= 63
  error_message = "S3 bucket name '${aws_s3_bucket.main.bucket}' exceeds 63 character limit (current: ${length(aws_s3_bucket.main.bucket)})"
}
```

## Conclusion

The native testing frameworks in both OpenTofu and Terraform represent a significant step forward in infrastructure testing maturity. By leveraging HCL for tests, teams can maintain consistency in their toolchain while achieving comprehensive test coverage.

Key takeaways:
- Use plan mode for fast unit tests, apply mode for integration tests
- Leverage mocking and overrides for complex scenarios
- Maintain cross-platform compatibility by using standard `.tftest.hcl` files  
- Structure tests logically and keep them independent
- Integrate testing into your CI/CD pipeline from the start

The days of requiring external testing frameworks for most infrastructure testing scenarios are behind us. With native testing capabilities, teams can build robust, reliable infrastructure with confidence, regardless of whether they choose OpenTofu or Terraform.

As the infrastructure as code landscape continues to evolve, having a solid testing strategy will become even more critical. The native testing framework provides the foundation for that strategy, enabling teams to catch issues early, validate changes confidently, and maintain high-quality infrastructure code.

---

*Ready to start testing your infrastructure? Begin with simple validation tests and gradually expand to more comprehensive integration scenarios. Your future self (and your team) will thank you for the investment in testing discipline.*
