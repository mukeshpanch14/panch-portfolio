---
title: "Python Application Configuration: ConfigParser vs python-decouple"
date: 2025-09-12 10:00
modified: 2026-10-12
category: Python
tags:
  - python
  - configuration
  - best-practices
slug: python-application-configuration
author: Panch Mukesh
summary: ConfigParser vs python-decouple: how to manage config and environment variables across DEV, QA and PROD in Python apps, with code.
---


# Python Application Configuration

## Introduction

Python is widely accepted for building various products such as APIs, data pipelines, and machine learning models. Our application often relies on different environment variables, which can be adjusted based on the environment in which the application is being executed. These variables include database connection strings, storage bucket names, and more. They need to be configured differently for various environments by injecting environment variables into the Docker container at runtime.

We can utilize the `os` module to handle reading environment variables with methods like `os.environ` and `os.environ.get`.

In a comprehensive product, we may encounter numerous configuration variables that depend on factors such as the chosen cloud service and the environment type (e.g., DEV/QA/PROD). Managing such a large number of variables using only the `os` module can become cumbersome.

## ConfigParser Approach

The `ConfigParser` module is one approach that serves the purpose of handling configuration variables. It expects a `.ini` file containing values for different variables and comes built into Python itself.

With `ConfigParser`, we can easily create and read configurations with various variables and sections. Organizing variables into different sections can be particularly useful for managing complex configurations.

**Example config.ini file:**
```ini
[Database]
url = localhost:5432/mydatabase
username = myuser
password = mypassword
```

**Python code using ConfigParser:**
```python
import configparser

# Initialize ConfigParser
config = configparser.ConfigParser()

# Load configuration from file
config.read('config.ini')

# Example usage
database_url = config.get('Database', 'url')
database_username = config.get('Database', 'username')
database_password = config.get('Database', 'password')
```

However, `ConfigParser` does not provide direct support for reading environment variables. To seamlessly handle environment variables, we need to add an additional wrapper module. Additionally, `ConfigParser` is designed to support only `.ini` files, which might not be the best choice if we need to work with other formats.

In my view, `ConfigParser` is suitable for Jupyter Notebook-based applications, where updating configuration variables is easy without much hassle.

## python-decouple Approach

`python-decouple` is a third-party package designed to seamlessly handle both configuration variables and environment variables. It supports various file formats such as `.ini`, `.env`, and plain text files.

One of the key advantages of `python-decouple` is its Pythonic approach to reading variables, offering flexibility to add additional functionality to the variables, such as casting to different formats, adding to enums, or reading directly in class or instance methods.

Let's explore an example demonstrating how we can utilize the `python-decouple` package for configuration:

```python
from decouple import config

class Config:
    """Config object class"""

    CONNECTION_STRING = config("DB_CONNECTION_STRING", default="localhost:5432")
    POLLING_INTERVAL = config("POLLING_INTERVAL", default=1, cast=int)
    DEBUG = True
    ENV = "local"

class DevConfig(Config):
    """Development environment config"""

    DEBUG = True
    ENV = "development"

class ProductionConfig(Config):
    """Production environment config"""

    DEBUG = False
    ENV = "production"


def get_config(env=config("ENVIRONMENT", default="")):
    """Method to access the config variables"""

    if env == "development":
        return DevConfig
    if env == "production":
        return ProductionConfig
    return Config
```

In the example above, we demonstrate how to handle config variables with different classes based on the environment to override values from the parent configuration. This approach allows for easy extension of the configuration module, such as for multi-cloud approaches with different configurations required to access cloud services.

## Which Value Wins?

The most common configuration bug is not knowing which source supplied a value. `python-decouple` has a fixed lookup order, so it is easy to reason about:

1. Environment variables
2. The `.env` or `settings.ini` file
3. The `default` argument

That order is what you want for containers: the same image runs everywhere, and DEV, QA and PROD only differ in the environment variables injected at runtime. A variable with no default raises `UndefinedValueError` when it is read, so a missing setting fails loudly at startup, not halfway through a request.

## Quick Comparison

| | `os.environ` | `ConfigParser` | `python-decouple` |
|---|---|---|---|
| Ships with Python | Yes | Yes | No (`pip install python-decouple`) |
| Reads environment variables | Yes | No | Yes |
| Reads a config file | No | `.ini` only | `.ini` and `.env` |
| Type casting | Manual | Helpers such as `getint`, `getboolean` | `cast=int`, `cast=bool`, `Csv()` |
| Defaults | `.get(key, default)` | `fallback=` | `default=` |
| Best for | A handful of variables | Notebooks, local tools | Services deployed through containers |

## Keep Secrets Out of Config Files

The `config.ini` example above includes a password to keep the example short. In a real project, do not commit credentials to a file in the repository. Keep a `.env` file out of version control (add it to `.gitignore`), and inject secrets as environment variables from your secret manager or CI system. Commit a `.env.example` with placeholder values so new contributors know which variables exist.

## When to Use Something Else

Both approaches treat values as strings that you cast yourself. If you want validation of types and required fields, a typed settings library such as `pydantic-settings` reads environment variables and `.env` files into a validated model. For a handful of variables, plain `os.environ.get` with a default is enough, and adding a dependency is not worth it.

## Conclusion

In conclusion, employing an organized approach to managing configuration and environment variables is crucial for the scalability of any application. Such an approach not only simplifies deployment across various platforms using tools like Docker but also streamlines local development. Ideally, designing a robust configuration module during the initial phases of development sets a strong foundation for scalability. This ensures that the application can easily accommodate the addition of new variables as it evolves over time.

