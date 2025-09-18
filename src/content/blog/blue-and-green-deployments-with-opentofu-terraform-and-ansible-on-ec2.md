---
title: "Blue-Green Deployments with OpenTofu/Terraform and Ansible on EC2"
description: "Implement blue-green deployments using OpenTofu/Terraform and Ansible on EC2 workloads"
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/opentofu-terraform-blue-green.jpg"
cardImageAlt: "Illustration of blue green deployments"
readTime: 4
tags: ["opentofu", "terraform", "ansible", "ec2"]
---

This article demonstrates the simplicity and benefits of leveraging OpenTofu/Terraform and Ansible for blue-green deployments when running workloads on EC2. We'll explore how this approach can enhance your projects and discuss best practices for structuring your project repository when integrating OpenTofu/Terraform and Ansible.

## Introduction to Blue-Green Deployments

Blue-green deployment is a strategy that reduces downtime and risk by running two identical production environments—**blue** and **green**. At any given time, only one environment is live and serving production traffic. You can safely deploy and test updates in the idle environment without affecting users. Once testing is complete and all checks pass, you can switch the live traffic to the updated environment. This approach not only eliminates deployment downtime but also allows for immediate rollback if unexpected issues arise.

## Solution Overview

This solution leverages OpenTofu/Terraform for managing blue-green environments and uses Ansible for configuration management. The project is structured so that OpenTofu/Terraform handles infrastructure provisioning while Ansible manages configuration for services. The CI pipeline drives the deployment, Ansible pulls configuration files specific to each environment, ensuring that updates are safely applied and tested in the idle environment before promoting it to production. This approach provides a seamless deployment experience, minimises downtime, and allows for quick rollbacks if needed.

The project repository is structured as follows:

```
├── Ansible
│   ├── playbook.yml
│   └── roles
│       └── nginx
│           ├── tasks
│           │   └── main.yml
│           ├── templates
│           │   └── index.html.j2
│           └── vars
│               ├── blue.yml
│               └── green.yml
├── LICENSE
├── README.md
└── Terraform
    ├── asg.tf
    ├── blue.tfvars
    ├── data.tf
    ├── green.tfvars
    ├── sg.tf
    ├── terraform.tf
    └── user_data.tpl
```

## Leveraging OpenTofu/Terraform Workspaces

> OpenTofu/Terraform Workspaces can be a powerful tool when used appropriately, but they aren't strictly necessary for managing multiple environments. An alternative approach is to use different tfvars files for each environment. In this setup, the structure of your project remains the same, but instead of selecting a workspace during deployment, you would pass the appropriate tfvars file for the environment you're deploying. This approach offers similar flexibility without needing to rely on workspaces for environment separation.

OpenTofu/Terraform Workspaces allow you to use the same OpenTofu/Terraform configuration to create multiple distinct environments. Each workspace has its own associated state file, making it an excellent fit for implementing blue-green deployments. You can create and select workspaces using the following commands:

- Create a new workspace:

  ```bash
  terraform workspace new <workspace_name>
  ```

- Select an existing workspace:

  ```bash
  terraform workspace select <workspace_name>
  ```

## Managing Variables and Configuration

Variables can be defined in various locations throughout the project. The deployment colour specified in the CI pipeline input parameters determines which variable files are used in both OpenTofu/Terraform and Ansible. This setup allows for different configurations for each environment, providing flexibility in how variables are passed down through the layers.

After initialising OpenTofu/Terraform, we select the workspace corresponding to the deployment colour. If the workspace does not exist, it is created automatically. We then specify the associated variable file when creating the OpenTofu/Terraform plan:

> OpenTofu/Terraform Workspaces do not automatically pull in tfvars files based on the workspace name

```bash
terraform plan -var-file=green.tfvars
```

Our ASG Launch Template `user_data` is generated via the `template_file` data block in OpenTofu/Terraform. This allows us to inject variables into the `user_data` script and pass them to Ansible via the ansible-pull command. We can use the `--extra-vars` flag to pass the deployment colour variable, which Ansible can use to include the correct variables for the infrastructure being configured by using `include_vars`.

This approach enables us to define variables at the start of the deployment process and efficiently pass them into the Infrastructure as Code (IaC) and Configuration Management layers. Structuring the project in this manner offers multiple benefits, the primary one being a clear separation between IaC and Configuration Management while leveraging the same codebase to create both blue and green environments.

## Conclusion

Blue-green deployments can be implemented in various ways depending on your technology stack. When it comes to OpenTofu/Terraform, using workspaces is a logical and effective approach for helping with state management across environments.

By structuring your project to leverage OpenTofu/Terraform Workspaces and integrating it seamlessly with configuration management tools like Ansible, you can achieve efficient, zero-downtime deployments with the flexibility to roll back changes instantaneously if necessary.
