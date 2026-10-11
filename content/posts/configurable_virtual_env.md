---
title: "Configurable Python Virtual Environments with Pipenv Categories"
date: 2025-09-12 10:00
modified: 2026-10-12
category: Python
tags:
  - python
  - pipenv
  - docker
slug: configurable-virtual-environments
summary: Use Pipenv --dev, --system and named categories to install only the dependencies each environment needs and keep Docker images lean.
status: published
---



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

```toml
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

## Putting It in a Dockerfile

The payoff is in the image build. Pass the target cloud as a build argument and install only that category:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir pipenv
COPY Pipfile Pipfile.lock ./

ARG CLOUD=aws
RUN pipenv install --system --deploy --categories "packages ${CLOUD}"
COPY . .
```

Build with `docker build --build-arg CLOUD=azure .` and the Azure SDK ships without boto3, and the other way round. I list `packages` explicitly so the result does not depend on how a particular Pipenv version treats the default group. After building, run `pip list` inside the image to confirm only the intended packages are present.

`--deploy` makes the install fail if `Pipfile.lock` is out of date, which is what you want in CI: the image is built from exactly what was locked. Lock after adding or changing a category with `pipenv lock`.

## Pitfalls

- **Dev tools in production images.** Plain `pipenv install` leaves out `[dev-packages]`, but `pipenv install --dev` does not. Keep `--dev` out of your production Dockerfile.
- **Forgetting to lock.** A new category is not reproducible until it is in `Pipfile.lock`. Commit both files.
- **Category names are free-form.** A typo such as `--categories awz` will not warn you the way a missing package would, so keep names short and document them in the README.
- **`--system` skips the virtualenv.** That is intentional inside a container, but do not use it on your laptop, where it installs into the global interpreter.

## When Not to Use This

For a small service with a single deployment target, one default group and one dev group is enough, and extra categories are just more to maintain. If your tooling already exports a `requirements.txt` per environment, or you have moved to another resolver such as Poetry or uv, use that tool's own dependency-group feature instead. The idea is the same: split dependencies by purpose and install only what the environment needs.
