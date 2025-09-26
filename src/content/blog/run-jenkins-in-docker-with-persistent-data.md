---
title: "Running Jenkins in Docker with Persistent Data"
description: "Quickly launch a test-friendly Jenkins instance in Docker, maintain configuration between restarts, and safely trial new features."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/jenkins.jpg"
cardImageAlt: "Running Jenkins in Docker with Persistent Data"
readTime: 2
tags: ["jenkins"]
---

Sometimes you need a clean, isolated instance of Jenkins to test new features, plugins, or configuration changes without risking your existing CI/CD environment. Spinning up a temporary Jenkins instance in Docker can be invaluable for verifying major updates or experimenting with new workflows in a controlled setting.

## Quick Ephemeral Setup

If you simply want to try something quickly—such as verifying a particular plugin or pipeline configuration—spinning up Jenkins as a disposable Docker container is straightforward. For instance:

```
docker run -p 8080:8080 jenkinsci/blueocean
```

This command gives you a fully functional Jenkins environment on port 8080. However, keep in mind that any changes you make are ephemeral. Once the container stops or is removed, all modifications will be lost.

## Persistent Jenkins with Docker Compose

To maintain your Jenkins data between restarts, you will need to use a persistent volume. Docker Compose makes this easy by defining a volume in a `docker-compose.yml` file and mapping it to the Jenkins home directory. This ensures your Jenkins configuration, jobs, and plugin installations persist across container shutdowns.

Below is an example `docker-compose.yml` file:

```
version: '3'
services:
  jenkins:
    container_name: jenkins
    image: 'jenkinsci/blueocean'
    ports:
      - '8080:8080'
      - '8443:8443'
      - '50000:50000'
    volumes:
      - 'jenkins_home:/var/jenkins_home'

volumes:
  jenkins_home:
    driver: local
```

When you run `docker-compose up -d`, Jenkins will start with a persistent `jenkins_home` volume. Any changes you make—such as installing plugins, configuring jobs, or adding credentials—will remain intact, even if you tear down and re-launch the container.

## Extending Your Jenkins Image

Sometimes you may need additional tools or binaries within your Jenkins environment. Perhaps you want to run OpenTofu/Terraform or the AWS CLI as part of your pipeline steps. Rather than installing these tools manually each time, you can create a custom Docker image built on top of the official Jenkins Blue Ocean image.

For example:

```
FROM jenkinsci/blueocean

USER root

RUN apk add python py-pip && \
    pip install awscli

RUN wget https://releases.hashicorp.com/terraform/0.12.26/terraform_0.12.26_linux_amd64.zip && \
    unzip terraform_0.12.26_linux_amd64.zip -d /bin && \
    rm terraform_0.12.26_linux_amd64.zip

USER jenkins
```

This Dockerfile starts from `jenkinsci/blueocean` and adds the AWS CLI and OpenTofu/Terraform 0.12.26. After building this image locally:

```
docker build -t jenkins .
```

You can update the `image` value in your `docker-compose.yml` to use your newly built image. This approach ensures your Jenkins environment is tailored to your testing needs, providing all the tools you require from the start.

## Additional Considerations

- **Security**: Although this setup is ideal for local testing, consider applying appropriate security measures if exposing Jenkins to external networks.
- **Networking**: If you want to connect Jenkins to other services (e.g. a local Git server or a containerised registry), you can add them to the same Docker Compose network.
- **Version Control**: Keep your `docker-compose.yml` and Dockerfile in version control. This makes it easy to roll back or compare changes as you iterate on your Jenkins test environment.

## Conclusion

By using Docker to run Jenkins, you gain a flexible, isolated environment for experimenting with new CI/CD configurations. Leveraging Docker Compose with persistent volumes ensures data is retained across container restarts, making it ideal for more extensive testing scenarios. Customising your Docker image with additional tools like AWS CLI or OpenTofu/Terraform provides a fully featured testbed, empowering you to iterate rapidly on your pipeline innovations without impacting your production Jenkins environment.
