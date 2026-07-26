# example_files/

Reference/starter material per jurisdiction, to make it faster to set up
`customer_standards/` for a new engagement. Each subfolder is a jurisdiction
you might be working with:

```
example_files/
├── example_private_context/
├── Federal/
├── VA/
├── PA/
├── CA/
├── MD/
└── HI/
```

This folder is committed to the repo — unlike `customer_standards/`, nothing
here is tied to one specific customer engagement, and all information is fully public, so it's meant to be shared reference material rather than gitignored.

## How to use this when starting a new engagement

1. Find the subfolder matching your customer's jurisdiction.
2. Read the subfolder's `README.md` for customer context.
3. Copy (not move) whatever's relevant into `../customer_standards/`.
4. Adjust/trim as needed for the specific engagement — `customer_standards/`
   should reflect what's actually true for *this* customer, not just a
   generic copy of the jurisdiction's example material.
5. Run `srg ingest --rebuild` from the project root.

Each jurisdiction subfolder has its own `README.md` stub (Folder Name /
Included Files / Useful Links) to be filled in as that jurisdiction's
material is researched and added.
