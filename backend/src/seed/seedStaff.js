// Demo staff accounts, one per staff role. The emails use the reserved .test domain.
const STAFF = [
  { name: 'Product Manager', email: 'product.manager@store.test', role: 'product_manager' },
  { name: 'Sales Manager', email: 'sales.manager@store.test', role: 'sales_manager' },
  { name: 'Support Agent', email: 'support.agent@store.test', role: 'support_agent' },
];

const HOME_ADDRESS = 'CS308 Store, Istanbul';

/*
 * Creates the staff accounts that do not exist yet.
 *
 * An account that already exists is never changed, so running this again does not
 * reset a password or change a role. The passwords of the new accounts are
 * returned so the caller can save them; they are never stored in plain text in
 * the database and never written to Git.
 *
 * Dependencies are injected so unit tests never touch a real database.
 */
async function seedStaff({ UserModel, hashPassword, makePassword, staff = STAFF }) {
  const created = [];
  const existing = [];

  for (const account of staff) {
    const found = await UserModel.findOne({ email: account.email });
    if (found) {
      existing.push(account.email);
      continue;
    }

    const password = makePassword();
    await UserModel.create({
      name: account.name,
      email: account.email,
      homeAddress: HOME_ADDRESS,
      role: account.role,
      passwordHash: await hashPassword(password),
    });
    created.push({ email: account.email, role: account.role, password });
  }

  return { created, existing };
}

module.exports = { seedStaff, STAFF };
