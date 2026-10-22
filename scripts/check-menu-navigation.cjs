const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '..');
const frontendRequire = createRequire(path.join(root, 'package.json'));
const esbuild = frontendRequire('esbuild');
async function main() {
const bundle = await esbuild.build({
  stdin: {contents: `export * from './src/features/workspaces/navigation'; export {WORKSPACE_MENU, DEFAULT_WORKSPACES} from './src/features/workspaces/defaults'; export {getAuthorizedMenu} from './src/shared/components/Layout/MenuUtils'; export * from './src/shared/components/Layout/menuTaskCounts';`, resolveDir: root, loader: 'ts'},
  bundle: true, packages: 'external', platform: 'node', format: 'cjs', write: false,
});
const compiled = {exports: {}};
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(frontendRequire, compiled, compiled.exports);
const {withMenuTaskCounts, getMenuTaskCount, canAccessWorkspace, getWorkspaceHome, getSelectedMenuKey, getMenuAncestors, WORKSPACE_MENU, DEFAULT_WORKSPACES, getAuthorizedMenu} = compiled.exports;
let checked = 0;
const eq = (actual, expected) => { assert.deepEqual(actual, expected); checked++; };
const flat = items => items.flatMap(item => [item, ...flat(item.children || [])]);
const menuFor = (workspace, permissions) => getAuthorizedMenu(WORKSPACE_MENU[workspace], new Set(permissions));
for (const key of ['sales', 'operations', 'warehouse', 'admin']) eq(canAccessWorkspace(key, new Set()), false);
for (const workspace of DEFAULT_WORKSPACES) eq(canAccessWorkspace(workspace.key, new Set(['system.rbac.admin'])), true);
const roles = [
  ['sales', ['sales.view'], '/dashboard'],
  ['sales', ['sales.delivery.confirm'], '/sales/deliveries'],
  ['sales', ['sales.invoice.issue'], '/sales/invoices'],
  ['sales', ['sales.invoice.view'], '/sales/invoices'],
  ['sales', ['sales.receivable.view'], '/sales/receivables'],
  ['sales', ['sales.profitability.view'], '/sales/reports'],
  ['sales', ['sales.credit.manage'], '/sales/credit'],
  ['sales', ['sales.alias.manage'], '/sales/aliases'],
  ['operations', ['operations.view'], '/operations'],
  ['operations', ['operations.road.manage'], '/operations/vehicle-dispatches'],
  ['warehouse', ['operations.view', 'sales.delivery.confirm'], '/operations/warehouse-dashboard'],
  ['warehouse', ['sales.delivery.confirm'], '/sales/deliveries'],
  ['warehouse', ['operations.warehouse.manage'], '/operations/daily-stock-reconciliation'],
  ['admin', ['users.view'], '/dashboard'],
];
for (const [key, permissions, home] of roles) {
  eq(canAccessWorkspace(key, new Set(permissions)), true);
  eq(getWorkspaceHome(key, new Set(permissions)), home);
  eq(getSelectedMenuKey(menuFor(key, permissions), home), home);
}
eq(flat(menuFor('sales', ['sales.invoice.issue'])).some(item => item.key === '/sales/orders'), false);
eq(flat(menuFor('sales', ['sales.invoice.issue'])).some(item => item.key === '/sales/invoices/settings'), true);
eq(flat(menuFor('warehouse', ['sales.delivery.confirm'])).some(item => item.key === '/operations/inventory-receipts'), false);
eq(flat(menuFor('warehouse', ['operations.view'])).some(item => item.key === '/sales/deliveries'), false);
eq(flat(menuFor('admin', ['users.view'])).some(item => item.key === '/settings/roles'), false);
eq(getSelectedMenuKey(WORKSPACE_MENU.sales, '/sales/orders/123'), '/sales/orders');
eq(getSelectedMenuKey(WORKSPACE_MENU.sales, '/sales/orders-other'), undefined);
eq(getSelectedMenuKey(WORKSPACE_MENU.sales, '/sales/invoices/settings'), '/sales/invoices/settings');
eq(getSelectedMenuKey(WORKSPACE_MENU.sales, '/notifications'), undefined);
eq(getMenuAncestors(WORKSPACE_MENU.operations, '/operations/vehicle-dispatches'), ['operations-road']);
eq(getMenuAncestors(WORKSPACE_MENU.warehouse, '/sales/deliveries'), []);
eq(getMenuAncestors(WORKSPACE_MENU.sales, '/sales/orders'), ['sales-orders']);
eq(getMenuAncestors(WORKSPACE_MENU.sales, '/missing'), []);
// Existing all-of requirements must retain their meaning alongside the new any-of requirements.
const permissionsFixture = [{key: '/both', label: 'Both', need: ['sales.view', 'sales.invoice.view']}, {key: 'group', label: 'Group', children: [{key: '/either', label: 'Either', needAny: ['sales.view', 'sales.invoice.view']}]}];
eq(getAuthorizedMenu(permissionsFixture, new Set(['sales.invoice.view'])).map(item => item.key), ['group']);
eq(getAuthorizedMenu(permissionsFixture, new Set()).length, 0);
eq(getAuthorizedMenu(permissionsFixture, new Set(['system.rbac.admin'])).length, 2);
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const paths = new Set([...router.matchAll(/path:\s*["']([^"']+)["']/g)].map(match => '/' + match[1].replace(/^\//, '')));
paths.add('/contracts/expiry-report');
for (const workspace of DEFAULT_WORKSPACES) {
  const items = flat(WORKSPACE_MENU[workspace.key]);
  const keys = items.map(item => item.key);
  eq(new Set(keys).size, keys.length);
  for (const item of items.filter(item => item.key.startsWith('/'))) eq(paths.has(item.key), true);
}
const {renderToStaticMarkup} = frontendRequire('react-dom/server');
const countedSales = withMenuTaskCounts(menuFor('sales', ['sales.view']), {'/sales/approvals': 150, '/sales/invoices': 10});
eq(getMenuTaskCount(menuFor('sales', ['sales.view']).find(item => item.key === 'sales-orders'), {'/sales/approvals': 150}), 150);
const salesMarkup = renderToStaticMarkup(countedSales.find(item => item.key === 'sales-orders').label);
eq(salesMarkup.includes('99+'), true);
eq(salesMarkup.includes('150 việc được giao đang chờ xử lý'), true);
eq(salesMarkup.includes('160 việc'), false);
const collapsed = withMenuTaskCounts(menuFor('sales', ['sales.view']), {'/sales/approvals': 2}, true);
eq(renderToStaticMarkup(collapsed.find(item => item.key === 'sales-orders').icon).includes('ant-badge-dot'), true);
for (const count of [0, -1, NaN, Infinity, 1.5, '3', undefined]) {
  eq(getMenuTaskCount({key: '/sales/approvals', label: 'Duyệt'}, {'/sales/approvals': count}), 0);
}
eq(renderToStaticMarkup(withMenuTaskCounts([{key: '/x', label: 'Tên rất dài'}])[0].label).includes('ant-badge-count'), false);
eq(flat(menuFor('admin', ['users.view'])).some(item => item.key === '/operations/price-discounts'), false);
eq(flat(menuFor('warehouse', ['operations.warehouse.manage'])).some(item => item.key === '/operations/inventory-accounting'), false);
console.log('Passed ' + checked + ' navigation assertions: roles, landing pages, active routes, groups, duplicate keys and route destinations.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
