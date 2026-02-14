Title: Configurable Virtual Environments
Date: 2025-09-12 10:00
Modified: 2025-09-12
Category: Python
Tags: python, pipenv, virtualenv
Slug: configurable-virtual-environments
Summary: How to use Pipenv categories and flags to create configurable virtual environments, keeping Docker images lightweight by installing only the dependencies you need.
Status: published


Virtual environments are essential components of any Python project. When it comes to implementing them, we consider various tools such as pipenv, requirements.txt, etc. <br>

To cater to our project requirements, we install various packages. However, it’s important to note that some packages are only necessary for specific aspects. For instance, the pytest package is not needed for application startup; it’s only required for development purposes. To maintain lightweight Docker images and application modules, it is advisable to make dependencies as configurable as possible based on the specific requirements.

## Development Purpose Packages

Pipenv can be utilized to manage a scenario where we can pass an additional argument, “_--dev_,” which can be used to install different packages when necessary.

```bash
# Install default and Dev Packages
pipenv install --dev

# Install only dev packages
pipenv install --dev-only
```

## Deploy System Dependencies

We can leverage pipenv to install a Pipfile’s contents into its parent system with the “_--system_” flag.

```bash
# Install packages to system
pipenv install --system
```

## Install Packages Conditionally

Similar to the installation of development packages, we can also categorize packages so that they can be installed individually or in groups. Nowadays, it is common to build products that are cloud-agnostic, requiring installation of cloud-specific dependencies to cater to different use cases.

However, when building Docker images for a particular cloud environment, dependencies for other clouds may be installed unnecessarily. This is just one example of the various use cases that can be accommodated in this implementation.

```bash
[packages]
Flask= {version="2.2.2", index="pypi"}

[aws]
boto3= {version="1.17.5", index="pypi"}

[azure]
azure-mgmt-storage = {version="==19.0.0", index="pypi"}

[dev-packages]
nox = {version="*", index="pypi"}
pytest = {version=">=7.2.0", index="pypi"}
```

Originally pipenv supported only two package groups: packages and dev-packages in the Pipfile which mapped to default and develop in the Pipfile.lock. Support for additional named categories has been added such that arbitrary named groups can utilized across the available pipenv commands.

```bash
# Install default packages only
pipenv install

# Install default packages and aws category
pipenv install --categories aws

# Install a new package to aws category
pipenv install moto --categories aws

# Install a package to multiple categories
pipenv install prometheus-client --categories="aws azure"

# Uninstall a package from a category
pipenv uninstall moto --categories aws
```

---

