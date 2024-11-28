---
title: "Kubernetes CLI Tools to Boost Your Productivity"
description: "Boost your Kubernetes productivity with essential CLI tools and tips for streamlined cluster management."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/kubernetes-cli.jpg"
cardImageAlt: "Kubernetes CLI Tools to Boost Your Productivity"
readTime: 4
tags: ["kubernetes"]
---

Mastering `kubectl` commands is invaluable, especially when preparing for certification exams. However, when troubleshooting issues directly via the command line, leveraging efficient Kubernetes CLI tools can significantly enhance your productivity and simplify complex tasks.

Below is a curated list of Kubernetes CLI tools to help you install, manage, troubleshoot, and interact with Kubernetes more effectively. If you manage Kubernetes in any capacity and aren't using these tools yet, they're definitely worth exploring.

## Helm

**Helm** is the package manager for Kubernetes. It simplifies the deployment and management of applications by packaging them into charts—collections of files that describe a related set of Kubernetes resources. Helm charts are maintained by the community and can be used to deploy complex applications with a single command.

By using Helm, you can:

- Encapsulate deployment complexities within the chart itself.
- Share and reuse charts for common applications.
- Version-control your deployments.
- Roll back to previous releases easily.

This results in a simplified and reproducible deployment process, saving time and reducing errors.

## kubectx and kubens

**kubectx** and **kubens** are command-line tools that make it easier to switch between Kubernetes contexts and namespaces.

- **kubectx** allows you to view all available contexts with a simple `kubectx` command. You can switch to a different context using `kubectx <context-name>`. To switch back to the previous context, use `kubectx -`, and to rename a context, use `kubectx <new-name>=<old-name>`.

- **kubens** lets you switch between namespaces effortlessly. Use `kubens <namespace>` to set the default namespace, or simply run `kubens` to list all available namespaces.

Using these tools can save a significant amount of time when working with multiple clusters and namespaces, streamlining your workflow.

## K9s

**K9s** is a terminal-based UI to interact with your Kubernetes clusters. It provides a convenient way to navigate resources, view logs, execute commands, and troubleshoot issues without leaving the terminal.

With K9s, you can:

- View and manage Kubernetes resources in a navigable interface.
- Inspect and edit resource YAML definitions.
- View logs from multiple pods and containers.
- Delete or restart pods with ease.
- Customise the interface with skins and themes.

K9s enhances your productivity by providing quick access to cluster information and actions with minimal keystrokes.

You can find the full list of commands and features install instructions on the [k9s](https://github.com/derailed/k9s) repo.

## Stern

**Stern** is a tool that allows you to tail logs from multiple pods and containers in real-time. It simplifies debugging by aggregating logs and highlighting output with colour coding.

With Stern, you can:

- Tail logs from all pods matching a specified pattern.
- Tail logs from multiple containers within pods.
- Use regular expressions to filter pods and containers.
- Colour-code output based on pods or containers for easy differentiation.

Stern is especially useful when working with microservices or deployments with multiple replicas.

Onstall instructions can be found on the [stern](https://github.com/wercker/stern) repo.

## krew

**krew** is the package manager for `kubectl` plugins. It allows you to discover and install plugins to extend and enhance `kubectl`'s functionality. With krew, you can easily find and use plugins developed by the Kubernetes community.

To install krew and manage plugins, you can follow the instructions on the [krew](https://github.com/kubernetes-sigs/krew) repo. Once installed, you can search for plugins using `kubectl krew search` and install them with:

```bash
kubectl krew install <plugin-name>
```

Using krew, you can access a wide range of plugins, such as `kubectl-tree`, `kubectl-neat`, and many others that can streamline your Kubernetes workflows.

## kubetail

**kubetail** is a shell script that enables you to aggregate logs from multiple pods into one output stream. This is particularly useful when you have multiple instances of an application running and need to debug issues across them simultaneously.

With kubetail, you can:

- Tail logs from all pods matching a pattern.
- Automatically retrieve pod names based on deployment names.
- Colour-code output for easier readability.

More information and install instructions can be found on the [kubetail](https://github.com/johanhaleby/kubetail) repo.

## kubectl-aliases

**kubectl-aliases** provides a set of convenient shell aliases for `kubectl` commands, significantly reducing the amount of typing required for common operations.

By installing kubectl-aliases, you get a comprehensive set of aliases, such as:

- `k` for `kubectl`
- `kgp` for `kubectl get pods`
- `kdsvc` for `kubectl describe svc`
- `krm` for `kubectl delete`

You can find the list of aliases and installation instructions on the [kubectl-aliases](https://github.com/ahmetb/kubectl-aliases) repo.

## kube-ps1

**kube-ps1** is a script that lets you display the current Kubernetes context and namespace in your shell prompt, helping you avoid mistakes when working with multiple clusters and namespaces.

By integrating kube-ps1 with your shell (Bash, Zsh, etc.), your prompt will include information about the active Kubernetes context and namespace, keeping you informed about your working environment at all times.

Installation instructions are available on the [kube-ps1](https://github.com/jonmosco/kube-ps1) repo.

## kubectl-tree

**kubectl-tree** is a `kubectl` plugin that shows the ownership hierarchy between Kubernetes objects. It helps you visualise how resources are related, such as which ReplicaSet is controlled by a Deployment and which Pods are controlled by a ReplicaSet.

By installing kubectl-tree, you can use:

```bash
kubectl tree <resource-type>/<resource-name>
```

This displays the resource hierarchy in a tree-like format, which is especially helpful when troubleshooting issues related to resource ownership and dependencies.

You can install kubectl-tree using krew:

```bash
kubectl krew install tree
```

## kubectl-neat

**kubectl-neat** is a `kubectl` plugin that cleans up Kubernetes object YAML and JSON output to make it more readable. It removes clutter like `managedFields` and `status` sections, allowing you to focus on the essential parts of the resource definitions.

After installing kubectl-neat, you can use it by piping the output of `kubectl` commands:

```bash
kubectl get pod my-pod -o yaml | kubectl neat
```

This can make reviewing resource configurations much easier.

## Auto-Completion

Set up shell auto-completion for `kubectl` to speed up command writing. For Bash, you can enable it with:

```bash
source <(kubectl completion bash>)
```

## Conclusion

While mastering `kubectl` commands is essential, leveraging additional CLI tools can significantly boost your productivity and simplify cluster management. Tools like Helm, kubectx, kubens, K9s, and others can streamline your workflows, making Kubernetes administration more efficient.

By integrating these tools into your daily operations, you can focus more on solving complex problems and less on repetitive tasks, ultimately improving your effectiveness.
