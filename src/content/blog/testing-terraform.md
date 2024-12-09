---
title: "Testing Terraform"
description: "Explore tools and strategies for integrating robust testing into your Terraform workflows."
pubDate: 2020-01-02
author: "Billy"
cardImage: "@/images/blog/testing-terraform.jpg"
cardImageAlt: "Testing Terraform"
readTime: 5
tags: ["testing", "terraform"]
---

When working with Terraform to manage infrastructure as code (IaC), rigorous testing is crucial. Testing should occur at all layers of an application’s lifecycle, and IaC is no exception. Integrating testing directly into your infrastructure pipelines allows you to validate compliance, security, and functionality early. This approach not only supports Test-Driven Development (TDD) for infrastructure but also reduces the cost of fixing issues discovered later.

In this post, we’ll explore various tools and frameworks available for testing Terraform code and discuss how you can integrate these into your CI/CD pipelines, such as those running in Jenkins. We’ll also highlight Terraform’s native testing framework, making it easier to adopt a “shift-left” approach to infrastructure testing.

## Why Test Terraform?

By testing your Terraform configurations, you:

- **Validate Compliance**: Ensure that your infrastructure meets the organisation’s policies and regulatory requirements from the outset.
- **Increase Confidence**: Gain assurance that changes will not break existing services or violate best practices.
- **Enable TDD**: Write tests first, then implement infrastructure code to satisfy them, improving reliability and maintainability.
- **Speed Up Feedback Loops**: Early detection of issues allows for quick remediation, preventing costly errors down the line.

## Approaches to Terraform Testing

You can integrate various testing tools and frameworks within your Terraform pipeline, ranging from native solutions to established third-party tools. Here are some popular options:

### Native Terraform Testing Framework

The **terraform test** command (introduced in 1.6) provides a native testing framework. This allows you to write test cases in HCL directly within your Terraform codebase. The tests are ran with `terraform test`, this allows a straightforward, integrated approach without relying on any external tools.

This native framework supports:

- **HCL Validation**: Define test cases that ensure outputs, variables, and resources meet expectations.
- **TDD Support**: Write tests before writing any Terraform code to ensure your infrastructure aligns with expected outcomes from the start.
- **Seamless Integration**: Since it’s part of Terraform, no additional setup is required beyond writing test configurations.

Terraform test can be executed in two modes: `plan` and `apply`. this providesg flexibility in how you validate your Terraform. Apply is ideal for integration testing, where you want to ensure that the infrastructure behaves exactly as expected in a live environment. On the other hand, plan mode simulates the infrastructure entirely in memory, using Terraform’s plan functionality without making any changes to your infrastructure. This mode is useful for unit testing or pre-deployment validation, as it allows you to check the logic and correctness of your Terraform code quickly and safely without provisioning resources. By leveraging these modes, you can create comprehensive testing strategies that balance speed, cost, and real-world accuracy.

### kitchen-terraform

**kitchen-terraform** provides Kitchen plugins enabling you to converge Terraform configurations and verify resulting infrastructure using InSpec controls. It allows:

- **Integration Testing**: Safely test Terraform changes without impacting production.
- **Flexible Convergence**: Spin up and tear down test environments for repeatable test runs.
- **InSpec Integration**: Validate compliance and security posture using a well-established auditing framework.

### serverspec

**serverspec** allows you to write RSpec-based tests for infrastructure. While not specifically designed for Terraform, it excels at unit testing and can validate resource configurations effectively.

### goss

**goss** uses YAML-based test definitions to streamline writing and running tests:

- **State-Based Validation**: Generate tests from the current system state.
- **Health Endpoint Serving**: Provide a health check endpoint for your tests.
- **High-Level and Accessible**: Quick to get started and easy for teams to adopt.

### inspec

**inspec** is an open-source testing and auditing framework that compares the actual state of your infrastructure to the desired state. With Chef InSpec, you can:

- **Comprehensive Auditing**: Validate configurations across a wide range of AWS resources.
- **SSM Integration**: Extend checks into EC2 instances via AWS Systems Manager.
- **Security Hub Integration**: Correlate findings and conduct thorough compliance reviews at scale.

## Integrating Testing into your Terraform Pipeline

By running tests within your Terraform pipeline, you gain immediate feedback on the state of your infrastructure after deployment. Ideally on feature branches on each commit. Consider adding a dedicated testing stage that runs compliance checks, security validations, and functional tests before any changes are approved and applied.

## Additional Best Practices

- **Unit Tests and Pre-Commit Hooks**: Run linters, unit tests, and security checks before pushing changes, ensuring only high-quality code enters the repository.
- **Integration Tests Post-Deployment**: After resources are deployed, run more extensive integration and compliance checks to validate everything is configured correctly.
- **Continuous Improvement**: Adjust and refine tests over time. Introduce stricter checks or remove redundant ones to maintain efficiency and accuracy.

## Conclusion

Testing Terraform is no longer an afterthought; it’s an integral part of delivering secure, compliant, and reliable infrastructure. Whether you opt for Terraform’s native testing framework or integrate third-party tools like kitchen-terraform, terraform-compliance, InSpec, or others, ensuring robust tests in your CI/CD pipeline provides early, actionable feedback.

By embracing TDD principles and employing a diverse set of testing tools, you can safeguard against misconfigurations, security vulnerabilities, and compliance violations. Combined with continuous monitoring and tooling like AWS Config or Security Hub, you gain a comprehensive, proactive stance on infrastructure quality. As infrastructure complexity grows, so does the importance of rigorous, automated testing, enabling teams to deploy with confidence and speed.
