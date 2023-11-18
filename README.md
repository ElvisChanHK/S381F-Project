# **School Mini Project <br> Developing**

## How to install and use

```
npm install
cp models/env.js.example models/env.js
```
Then [set up ENV](models/env.js), fill in the mongoDB URL and set the session secret

```
gulp
```

The default user are:
|username|password|role |
|--------|--------|-----|
|admin   |admin   |admin|
|demo    |demo    |user |

Open https://localhost:3999/ , it should be redirect to login page.

## Doing
- Inventory system
- CRUD services for Inventory system
- At least 4 APIs for 4 CRUD operations
- Rewrite README.md
