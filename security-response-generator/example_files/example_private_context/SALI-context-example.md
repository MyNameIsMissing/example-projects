# SALI

The SALI system is a Node and Python based system running in Microsoft Azure kubernetes containers.  It is run by the Department of Labor in the State of Virginia.

## Monitoring

The SALI system uses native Azure monitoring and alerting tools in addition to Splunk for log aggregations and analysis and NewRelic for APM.

## Web attack prevention

The SALI web app is fronted by a container running Nginx as a reverse proxy.  WAF ruls such as XSS and IP blocks are implemented directly at the Nginx layer by a module running the OWASP Core Rule Set and custom rules created by the SALI engineers.  A small number of defense mechanisms are enabled directly at the web app later.  

There is no dedicated application layer DDoS prevention layer such as Cloudflare.  The Microsoft Azure cloud networking load balancers natively provide IP layer DDoS prevention such as against syn ack attacks, but Micosoft fully controls those features with no ability for SALI to make adjustments.

## General architecture

- tbd

## Identity, Authentication, and Access

- tbd

## Organizational Structure and Separation of Duties

- tbd

## Least Functionality Posture

- deny by default, allow by exception
- tbd

## Canonical Decisions and Definitions

- Sensitive data above class 2 is not allowed in the SALI system

## Completed Control Response example outlines

- IA-2 - Identification & Authentication: Login.gov (users), Okta → IAM Identity Center (engineers), MFA everywhere, no SMS, RBAC, Okta federation to Enterprise SaaS.
- AC-5 - Separation of Duties: four-category mapping, admin/audit segregation (OSM/SOC for Azure; broader engineering staff for Node/Python), role-assumption rather than seperate accounts.
- tbd
