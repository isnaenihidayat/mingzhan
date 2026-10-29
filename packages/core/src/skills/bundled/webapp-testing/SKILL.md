---
name: webapp-testing
description: Web application testing, browser regression checks, DOM interactions and UI screenshots. Pengujian aplikasi web, tes browser, regresi UI.
include-body-on-match: false
---

Validate an application's actual behavior within the requested scope.

1. Identify the target URL/project and critical user flows. Read existing test commands and reuse the project's test framework. Do not assume Playwright, a browser or a running server exists.
2. Use unit/component/integration checks when they answer the question. Use browser automation only when the user requests it and the assigned tools/runtime support it; do not install a browser test stack merely because this skill was matched.
3. Use role/text locators, await observable states rather than arbitrary delays, and isolate test data. Do not send messages, purchase items or alter production records without authorization for that operation.
4. Assert outcomes: navigation, saved data, error handling, keyboard flow and relevant layout behavior. Record console/network errors and distinguish product failures from unavailable services or test environment problems.
5. Return findings with reproducible steps, expected/actual behavior and the checks that ran. Save requested screenshots/reports as artifacts. A test plan is not an executed test report.
