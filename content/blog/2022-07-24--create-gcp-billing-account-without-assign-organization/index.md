+++
title = "Create GCP billing account without assign organization"
description = "I'm having an issue where I can't unselect an organization when creating a new project in the GCP Console. Find a workaround for this problem."
slug = "create-gcp-billing-account-without-assign-organization"
date = "2022-07-24"

[taxonomies]
tags = ["gcp"]

[extra]
featured = true
+++

## Background

I have some organization-assigned projects created before.

## Problem

I'm trying to create a new billing account without assign any organization but it's impossible by the GCP console.

{{ figure(src="console.png", alt="Cannot clear 'Organization' field") }}

The Organization field was disabled and I can't clear that field. My new project is not belongs to organization, so I have to create a billing account that is not linked to the organization.

## Solution

Send a HTTP request manually.

First, I found the request from dev tools. It can be easily found by filtering url by `BILLING_ACCOUNTS_GRAPHQL`. After found, Copy as cURL from the context menu of the request row.

{{ figure(src="copy-from-devtools.png", alt="Copy as cURL from Chrome dev tools") }}

The copied request looks like this:

```bash
curl 'https://cloudconsole-pa.clients6.google.com/v3/entityServices/BillingAccountsEntityService/schemas/BILLING_ACCOUNTS_GRAPHQL:graphql?key=<HIDDEN>&prettyPrint=false' \
[...COLLAPSED...]
  --data-raw $'{"requestContext": [...COLLAPSED...] "variables":{"billingAccount":{"displayName":"My Billing Account","currencyCode":"KRW","organizationName":"organizations/<ORG_ID>"},"isFreeTrialAccount":false,"hasVerifiedBusinessEmail":false}}' \
  --compressed
```

You can edit the `"organizationName": "organizations/<ORG_ID>"` part in the `--data-raw` parameter. Replace `"organizationName": "organizations/<ORG_ID>"` to `"organizationName": null`.

```bash
curl 'https://cloudconsole-pa.clients6.google.com/v3/entityServices/BillingAccountsEntityService/schemas/BILLING_ACCOUNTS_GRAPHQL:graphql?key=<HIDDEN>&prettyPrint=false' \
[...COLLAPSED...]
  --data-raw $'{"requestContext": [...COLLAPSED...] "variables":{"billingAccount":{"displayName":"My Billing Account","currencyCode":"KRW","organizationName":null},"isFreeTrialAccount":false,"hasVerifiedBusinessEmail":false}}' \
  --compressed
```

After execute the command, a billing account will be created and you will be able to find the id in the response.

```json
[{"data":{"billingAccountsMutation":{"createBillingAccount":{"id":"<BILLING-ACCOUNT-ID>","displayName":"My Billing Account","currencyCode":"KRW", [...COLLAPSED...]
```

In my case, I haven't been able to see the newly created account in the list yet. However, I was able to directly access the newly created account through the following address:

[https://console.cloud.google.com/billing/&lt;BILLING-ACCOUNT-ID&gt;/]([https://console.cloud.google.com/billing/%3CBILLING-ACCOUNT-ID%3E/])

When you open the page, you can set up your billing account. After setup, I was able to use my billing account normally.
