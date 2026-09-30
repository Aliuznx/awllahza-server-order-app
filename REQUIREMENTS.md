# Restaurant menu and ordering application

Status: implemented and running locally with actual MySQL persistence. Public hosting is not yet configured. See README.md for usage and validation.

## Confirmed scope

- A browser-based application usable on phones, tablets, and desktop computers.
- Application languages: English and Arabic only, including customer screens, validation, order confirmations, and the restaurant administration panel.
- Arabic layouts support right-to-left text. Phone numbers and other directional values remain readable.
- Copy the source restaurant's products, descriptions, ingredients, calorie information, and available product assets. Preserve source prices and availability once verified.
- Every active, orderable product has an add-to-cart icon and quantity increase/decrease controls.
- A clearly visible cart control near the upper-right area shows the current quantity and order total. Preserve convenient access on mobile and in Arabic layouts.
- The cart itemizes selected products, quantities, unit prices, and the final amount payable.
- Checkout requires first name, last name, and phone number.
- Cash is the only supported payment method. Submitting an order does not mark it as paid.
- The restaurant has an authenticated administration panel showing orders submitted through this application.
- Requested technologies: Node.js, Python, and MySQL.

## Confirmed follow-up decisions

- Source: https://awllahza.com/; copy all products and keep the existing design and logo.
- Location: Uhud, Dammam, Saudi Arabia; the supplied Google Maps link resolves to the same coordinates as the source site.
- Currency: SAR. Menu prices are final; no additional taxes, service fees, or other charges are added.
- Fulfillment: pickup and dine-in. Customers enter their table number manually for dine-in.
- Each order receives a unique number, used for collection at the restaurant.
- New orders await restaurant approval. Only staff acceptance starts preparation; staff mark orders ready, which customers see on their private tracking screen.
- Default language follows the browser language, with manual English/Arabic switching.
- Admin can edit product information, prices, calories, availability, and opening/closing times.
- Keep the admin panel basic; no printer, messaging, or extra reporting integration is required.
- Order hours: 16:30 until 02:00 the following day, using Asia/Riyadh time.
- Set up the required software. Node.js dependencies and a portable MySQL instance are installed locally; the bundled Python runtime runs the import.

## Delivery status

- 6 categories, 26 products, 42 price options imported from the source snapshot.
- Customer cart, cash checkout, private status tracking, admin approval, and catalog editing implemented.
- 10 domain tests and 11 real-MySQL integration tests passed, including UTC timestamps and overnight business hours.
- Browser flow verified: add an option, change quantity, submit a dine-in order, sign into admin, accept it, mark it ready, and see Arabic customer tracking.
- Local preview is explicitly in test mode. Production requires a selected domain and host access; no existing website was replaced.

## Proposed allocation of responsibilities

- Web interface: HTML, CSS, and JavaScript, with shared English/Arabic translations and responsive layouts.
- Node.js: web application and order API, authentication, server-side validation, price calculation, and restaurant order access.
- Python: source-menu extraction, normalization, and an auditable import process. Import must be repeatable without duplicating products.
- MySQL: products, translations, categories, availability, administration accounts, orders, order lines, and any confirmed fulfillment configuration.

This allocation uses both requested languages without introducing two independent systems that can create or price orders differently. A separate Python runtime API is not assumed unless a concrete need emerges.

## Data integrity and access requirements

- Calculate accepted prices and totals on the server from the current catalog; never trust prices supplied by the browser.
- Store monetary values without floating-point rounding errors. Confirm currency and applicable precision before defining the final schema.
- Reject inactive products and invalid quantities during checkout, even when an old cart still contains them.
- Create the order and its lines atomically. Repeated submission of the same checkout must not create duplicate orders.
- Preserve ordered product names, unit prices, quantities, and confirmed options on order lines so later catalog edits do not rewrite historical orders.
- Show an order confirmation only after the server has saved the order successfully.
- Keep customer details out of public catalog responses and public order lists.
- Require authentication for order administration; store password hashes rather than plaintext passwords.
- Apply request validation and protection against automated order and login abuse.
- Do not invent product details, calorie values, prices, translations, or availability. Record missing information for clarification.
- Keep the source URL and import provenance to reconcile the copied catalog against the source.

## Delivery scope

The user explicitly chose local computer testing for now. No public deployment is required for this delivery. The local application and MySQL are running in test mode. Phone collection and syntax validation are implemented; SMS verification was not requested. Source-missing calories remain unknown and can be filled in by the restaurant through admin.

## Verification before completion

- Reconcile source and imported counts, categories, names, descriptions, ingredients, calories, prices, assets, and active status.
- Verify English and Arabic throughout the customer and administration flows, including RTL behavior and mobile layouts.
- Verify add, increase, decrease, remove, cart totals, empty-cart behavior, and checkout validation.
- Verify a persisted cash order appears in the authenticated administration panel with the correct customer details and totals.
- Verify unavailable products, changed prices, repeated submissions, and failed network requests cannot silently produce an incorrect or duplicate order.
- Verify unauthorized users cannot read customer details or change restaurant orders.
- Test against a real MySQL instance before describing persistence as verified.
- Report any remaining import, deployment, or integration blockers explicitly.
