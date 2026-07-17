export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "AuraAlert Enterprise API Docs",
    description: "Production API specification for AuraAlert notification orchestration, queue telemetry, credential vault, and RBAC access control.",
    version: "1.0.0",
    contact: {
      email: "TheoDesmon71@gmail.com"
    }
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Dev Ingress Gateway"
    },
    {
      url: "https://ais-dev-zjhunqogufioutuc2fsfnr-32385604999.europe-west2.run.app",
      description: "Production Environment Ingress Gateway"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Access Token for RBAC admin/operator/viewer actions"
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Application Client API Key used for programmatic notification triggers"
      }
    }
  },
  paths: {
    "/api/metrics": {
      get: {
        summary: "Fetch Prometheus Metrics",
        description: "Exposes application telemetry metrics for Prometheus scraping.",
        tags: ["System Telemetry"],
        responses: {
          "200": { description: "Prometheus metrics format" }
        }
      }
    },
    "/api/export/{type}/{format}": {
      get: {
        summary: "Export Reports",
        description: "Exports logs or analytics in CSV, XLSX, PDF, or PPTX format.",
        tags: ["Reports"],
        parameters: [
          { name: "type", in: "path", required: true, schema: { type: "string", enum: ["logs", "analytics"] } },
          { name: "format", in: "path", required: true, schema: { type: "string", enum: ["csv", "xlsx", "pdf", "pptx"] } }
        ],
        responses: {
          "200": { description: "Export file" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Establish Platform Auth Session",
        description: "Verifies user credentials via bcrypt and issues a signed JWT token complete with roles and permissions claims.",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "TheoDesmon71@gmail.com" },
                  password: { type: "string", example: "admin" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Authentication successful, returns bearer token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        email: { type: "string" },
                        role: { type: "string" },
                        permissions: { type: "array", items: { type: "string" } }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Invalid email or password" }
        }
      }
    },
    "/api/rbac/users": {
      get: {
        summary: "List RBAC Users",
        description: "Retrieve all registered administrative and operator tenant users.",
        tags: ["RBAC Control Plane"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Users list retrieved successfully" }
        }
      },
      post: {
        summary: "Create RBAC User",
        description: "Register a new operator or viewer with a password securely hashed via bcrypt.",
        tags: ["RBAC Control Plane"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "role_id"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  role_id: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "User provisioned successfully" }
        }
      }
    },
    "/api/rbac/users/{id}": {
      delete: {
        summary: "Delete RBAC User",
        tags: ["RBAC Control Plane"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "User deleted successfully" }
        }
      }
    },
    "/api/rbac/roles": {
      get: {
        summary: "List RBAC Roles",
        tags: ["RBAC Control Plane"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Roles list retrieved successfully" }
        }
      }
    },
    "/api/applications": {
      get: {
        summary: "List Client Applications",
        tags: ["Applications"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "List of applications retrieved successfully" }
        }
      },
      post: {
        summary: "Register Client Application",
        tags: ["Applications"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "environment"],
                properties: {
                  name: { type: "string", example: "CRM Portal API" },
                  environment: { type: "string", example: "staging" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Application registered successfully" }
        }
      }
    },
    "/api/applications/{id}": {
      delete: {
        summary: "De-register Client Application",
        tags: ["Applications"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Application deleted successfully" }
        }
      }
    },
    "/api/applications/{id}/settings": {
      post: {
        summary: "Update Application Tenant Configuration",
        description: "Configure rate limiting, webhook endpoints, active flags, and branding values.",
        tags: ["Applications"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rate_limit: { type: "integer" },
                  webhook_url: { type: "string" },
                  webhook_secret: { type: "string" },
                  webhook_active: { type: "boolean" },
                  branding: { type: "object" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Settings updated successfully" }
        }
      }
    },
    "/api/providers": {
      get: {
        summary: "List Carrier Routing Gateways",
        tags: ["Carrier Providers"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "List of active/inactive carrier providers" }
        }
      },
      post: {
        summary: "Create Carrier Routing Gateway",
        tags: ["Carrier Providers"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "channel", "config"],
                properties: {
                  name: { type: "string", example: "Custom SMTP Relay" },
                  channel: { type: "string", example: "email" },
                  config: { type: "object", example: { host: "smtp.relay.net", port: 465 } },
                  priority: { type: "integer", example: 1 },
                  is_active: { type: "boolean", example: true }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Provider created" }
        }
      }
    },
    "/api/providers/{id}": {
      put: {
        summary: "Update Carrier Gateway Configuration",
        tags: ["Carrier Providers"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object"
              }
            }
          }
        },
        responses: {
          "200": { description: "Gateway updated successfully" }
        }
      },
      delete: {
        summary: "De-register Carrier Gateway",
        tags: ["Carrier Providers"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Gateway deleted successfully" }
        }
      }
    },
    "/api/providers/{id}/toggle": {
      post: {
        summary: "Toggle carrier gateway routing status",
        tags: ["Carrier Providers"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["is_active", "channel"],
                properties: {
                  is_active: { type: "boolean" },
                  channel: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Toggle successful" }
        }
      }
    },
    "/api/providers/{id}/test": {
      post: {
        summary: "Test Provider Connection Gateway",
        description: "Triggers a live round-trip diagnostic packet to test carrier endpoints.",
        tags: ["Carrier Providers"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Diagnostics test completed" }
        }
      }
    },
    "/api/providers/{id}/diagnostics": {
      post: {
        summary: "Execute Diagnostic Telemetry Tests",
        tags: ["Carrier Providers"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Diagnostics telemetry evaluated" }
        }
      }
    },
    "/api/queues/status": {
      get: {
        summary: "Fetch Queue Orchestration Telemetry",
        description: "Retrieve buffer levels for active queues, retries, and the Dead Letter Queue (DLQ).",
        tags: ["Queue & Broker Telemetry"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "List of queues and their metrics" }
        }
      }
    },
    "/api/queues/{name}/action": {
      post: {
        summary: "Send Broker Flow Action Control",
        description: "Control background workers with pause, resume, clear, or flush actions.",
        tags: ["Queue & Broker Telemetry"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "name", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["pause", "resume", "clear", "flush_dlq"] }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Queue action processed" }
        }
      }
    },
    "/api/vault/secrets": {
      get: {
        summary: "List Vault Credentials",
        tags: ["Security Vault"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Credential keys retrieved successfully" }
        }
      }
    },
    "/api/vault/secrets/rotate": {
      post: {
        summary: "Rotate Secret Credentials Key",
        tags: ["Security Vault"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["key"],
                properties: {
                  key: { type: "string" },
                  secret_value: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Credential successfully rotated" }
        }
      }
    },
    "/api/events/registry": {
      get: {
        summary: "List Registered System Events",
        tags: ["Event Bus Registry"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Event templates retrieved" }
        }
      }
    },
    "/api/events/registry/register": {
      post: {
        summary: "Register Triggerable System Event",
        tags: ["Event Bus Registry"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  appId: { type: "string" },
                  variables: { type: "array", items: { type: "string" } },
                  priority: { type: "string" },
                  retryPolicy: { type: "object" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Event registered" }
        }
      }
    },
    "/api/templates": {
      get: {
        summary: "List Notification Templates",
        tags: ["Template Engine"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Templates retrieved" }
        }
      },
      post: {
        summary: "Create Notification Template",
        tags: ["Template Engine"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "subject", "content", "channel"],
                properties: {
                  name: { type: "string" },
                  subject: { type: "string" },
                  content: { type: "string" },
                  channel: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Template created" }
        }
      }
    },
    "/api/templates/{id}": {
      put: {
        summary: "Modify Notification Template",
        tags: ["Template Engine"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object"
              }
            }
          }
        },
        responses: {
          "200": { description: "Template updated" }
        }
      },
      delete: {
        summary: "Delete Notification Template",
        tags: ["Template Engine"],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Template deleted" }
        }
      }
    },
    "/api/templates/ai-suggest": {
      post: {
        summary: "Generate Template via Gemini Cognition API",
        tags: ["Template Engine"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt", "channel"],
                properties: {
                  prompt: { type: "string" },
                  channel: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "AI suggested template text returned" }
        }
      }
    },
    "/api/logs": {
      get: {
        summary: "Fetch Notification Audit Logs",
        tags: ["Logs & Analytics"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Audit trail log records" }
        }
      }
    },
    "/api/analytics": {
      get: {
        summary: "Fetch Delivery Performance Telemetry",
        tags: ["Logs & Analytics"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Full delivery rates and distributions" }
        }
      }
    },
    "/api/analytics/costs": {
      get: {
        summary: "Fetch SLA Financial Spend Metrics",
        tags: ["Logs & Analytics"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Daily cost aggregates and projections" }
        }
      }
    },
    "/api/analytics/sla": {
      get: {
        summary: "Fetch SLA Ingress Latency Performance",
        tags: ["Logs & Analytics"],
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Average round-trip handshake compliance rates" }
        }
      }
    },
    "/api/notifications/send": {
      post: {
        summary: "Dispatch Orchestrated Notification Alert",
        description: "Programmatic gateway trigger used by integrated applications to send notifications (Email, SMS, WhatsApp, In-App). Uses templated rendering.",
        tags: ["Programmatic Dispatch"],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["template", "recipient"],
                properties: {
                  template: { type: "string", example: "order.shipped" },
                  recipient: { type: "string", example: "customer@gmail.com" },
                  variables: {
                    type: "object",
                    example: { firstName: "John", orderNumber: "AA-9410", deliveryDate: "July 20th" }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Notification queued successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    jobId: { type: "string" },
                    status: { type: "string" },
                    channel: { type: "string" },
                    provider: { type: "string" },
                    recipient: { type: "string" }
                  }
                }
              }
            }
          },
          "401": { description: "Unauthorized or Invalid API Key" },
          "404": { description: "Template not found" }
        }
      }
    }
  }
};
