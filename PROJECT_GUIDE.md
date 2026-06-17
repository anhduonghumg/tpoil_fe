# Huong Dan Du An Frontend

Tai lieu nay danh cho lap trinh vien moi tham gia du an. Muc tieu la giup nam nhanh cach chay project, cau truc source code va cac quy uoc dang duoc dung trong frontend.

## 1. Tong quan

Day la ung dung frontend duoc xay dung bang:

- React 18
- Vite
- React Router
- TanStack React Query
- Ant Design
- Axios
- Zustand
- Zod

Ung dung co dang SPA, giao tiep voi backend qua REST API. Cac man hinh nghiep vu duoc chia theo module trong `src/features`.

## 2. Yeu cau moi truong

Can cai dat:

- Node.js phien ban LTS
- npm
- Backend API tuong ung voi cac endpoint trong `src/config/routes.ts`

Kiem tra nhanh:

```bash
node -v
npm -v
```

## 3. Cai dat va chay local

Cai dependency:

```bash
npm install
```

Tao file moi truong local neu chua co:

```bash
.env
```

Cac bien moi truong quan trong:

```bash
VITE_API_URL=http://localhost:3000
VITE_API_PREFIX=/api
VITE_API_VERSION=
VITE_XSRF_COOKIE=
VITE_XSRF_HEADER=
```

Gia tri thuc te phu thuoc vao backend dang chay. Frontend ghep `VITE_API_URL` va `VITE_API_PREFIX` de tao `API_BASE` trong `src/config/env.ts`.

Chay dev server:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Preview ban build:

```bash
npm run preview
```

Chay lint:

```bash
npm run lint
```

## 4. Cau truc thu muc

```text
src/
  app/                 Khoi tao app, router shell, splash screen
  assets/              Anh va asset tinh
  config/              Cau hinh route API va bien moi truong
  data/                Du lieu tinh dung trong frontend
  features/            Cac module nghiep vu
  page/                Trang rieng/le hoac trang test
  shared/              Thanh phan, hook, lib, authz dung chung
```

Trong moi module tai `src/features/<module>` thuong co:

```text
api.ts                 Goi API cua module
hooks.ts               React Query hooks cua module
types.ts               Type dung rieng cho module
page/                  Page container
ui/                    Component giao dien cua module
lib/                   Ham xu ly rieng cua module neu can
validators.ts          Schema validate neu can
```

Vi du module `customers`:

```text
src/features/customers/
  api.ts
  hooks.ts
  types.ts
  page/CustomersPage.tsx
  ui/
```

## 5. Luong khoi tao ung dung

Diem vao chinh:

- `src/main.jsx`: render React app vao DOM.
- `src/App.jsx`: boc app bang `QueryClientProvider` va `ConfigProvider` cua Ant Design.
- `src/app/AppInit.tsx`: load user tu cache, hien splash screen ngan, sau do render router.
- `src/app/router.tsx`: khai bao route man hinh.
- `src/app/PrivateShell.tsx`: bao ve cac route can dang nhap.

Luang bao ve dang nhap:

1. User vao route trong `/`.
2. `PrivateShell` dung `AppSessionProvider` de lay thong tin session.
3. Neu chua dang nhap, dieu huong ve `/login`.
4. Neu da dang nhap, render `AppLayout` va cac route con.

## 6. Routing man hinh

Router frontend nam trong:

```text
src/app/router.tsx
```

Khi them man hinh moi:

1. Tao page trong `src/features/<module>/page`.
2. Import page vao `src/app/router.tsx`.
3. Them route moi vao mang `createBrowserRouter`.
4. Neu can hien tren sidebar, them item vao `src/shared/components/Layout/MenuConfig.tsx`.
5. Neu route can phan quyen, boc bang `RouteGuard` va them permission vao `src/shared/authz/perms.ts`.

Vi du route co phan quyen:

```tsx
{
  path: "users",
  element: (
    <RouteGuard need={PERMS.USERS_VIEW}>
      <UsersPage />
    </RouteGuard>
  ),
}
```

## 7. Cau hinh API

Tat ca endpoint nen duoc khai bao tap trung tai:

```text
src/config/routes.ts
```

Moi route API thuong co dang:

```ts
customer: {
  list: ["GET", "/customers"],
  detail: ["GET", "/customers/:id"],
}
```

Khi can thay `:id` bang gia tri that, dung `apiCall` voi `params`.

Ham goi API dung chung nam tai:

```text
src/shared/lib/api.ts
```

Vi du:

```ts
apiCall("customer.detail", {
  params: { id: customerId },
});
```

Axios instance nam tai:

```text
src/shared/lib/http.ts
```

Mac dinh:

- `baseURL` lay tu `API_BASE`
- `withCredentials: true`
- co interceptor xu ly session het han

## 8. Pattern API va React Query

Moi feature nen tach ro:

- `api.ts`: chi goi HTTP va map response.
- `hooks.ts`: khai bao `useQuery`, `useMutation`, invalidate cache.
- `page/*.tsx`: quan ly state page, filter, selected row, modal/drawer.
- `ui/*.tsx`: component giao dien co props ro rang.

Vi du pattern:

```ts
// api.ts
export const CustomersApi = {
  list: (query) =>
    apiCall("customer.list", { query }).then((r) => r.data.data),
};
```

```ts
// hooks.ts
export const useCustomerList = (params) =>
  useQuery({
    queryKey: ["customers", "list", params],
    queryFn: () => CustomersApi.list(params),
  });
```

Khi mutation thanh cong, can invalidate cac query bi anh huong:

```ts
qc.invalidateQueries({ queryKey: ["customers", "list"] });
qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
```

## 9. Phan quyen

Permission code nam trong:

```text
src/shared/authz/perms.ts
```

Cac thanh phan lien quan:

- `AuthzProvider`: doc permission tu bootstrap data trong React Query cache.
- `RouteGuard`: chan route neu user khong co quyen.
- `PermissionGate`: an/hien mot phan UI theo quyen.
- `useCan`: hook kiem tra quyen trong component.

Khi them quyen moi:

1. Them ma quyen vao `PERMS`.
2. Dam bao backend tra permission do trong bootstrap/session.
3. Dung `RouteGuard`, `PermissionGate` hoac `useCan` o noi can bao ve.

## 10. UI va layout

Du an dung Ant Design la UI library chinh.

Theme Ant Design cau hinh trong:

```text
src/App.jsx
```

Layout chinh:

```text
src/shared/components/Layout/AppLayout.tsx
src/shared/components/Layout/MenuConfig.tsx
src/shared/components/Layout/AppLayout.css
```

Component dung chung nam trong:

```text
src/shared/ui/
src/shared/components/
```

Nen tai su dung cac component co san truoc khi tao component moi, vi du:

- `CommonModal`
- `CommonDrawer`
- `CommonActionMenu`
- `ActionButtons`
- cac select dung chung nhu `CustomerSelect`, `EmployeeSelect`, `ContractTypeSelect`

## 11. Quy trinh them mot feature moi

Vi du them module `products-new`:

1. Tao thu muc:

```text
src/features/products-new/
  api.ts
  hooks.ts
  types.ts
  page/ProductsNewPage.tsx
  ui/
```

2. Khai bao endpoint trong `src/config/routes.ts`.
3. Viet API wrapper trong `api.ts`.
4. Viet query/mutation hooks trong `hooks.ts`.
5. Tao page container trong `page`.
6. Tao table, filter, form, modal/drawer trong `ui`.
7. Them route vao `src/app/router.tsx`.
8. Them menu item vao `MenuConfig.tsx` neu can.
9. Them permission neu module can bao ve.
10. Chay `npm run lint` va kiem tra luong tao/sua/xoa tren UI.

## 12. Luu y khi code

- Khong goi axios truc tiep trong component page/ui neu co the dua vao `api.ts`.
- Query key nen co namespace ro rang, vi du `["customers", "list", params]`.
- Mutation tao/sua/xoa nen invalidate query list va detail lien quan.
- Form nen tach thanh component rieng neu co nhieu field.
- Page nen giu logic dieu phoi; component `ui` nen nhan props va han che tu goi API neu khong can.
- Endpoint moi nen khai bao trong `ROUTES`, khong hard-code URL rai rac.
- Dung cac helper notification, confirm, message trong `src/shared/lib` de giu trai nghiem thong nhat.

## 13. Cac module nghiep vu chinh

Mot so module hien co:

- `auth`: dang nhap va session
- `dashboard`: trang tong quan
- `users`: quan ly tai khoan nguoi dung
- `employees`: quan ly nhan vien
- `departments`: phong ban
- `customers`: khach hang va nha cung cap
- `customer-groups`: nhom khach hang
- `contracts`: hop dong
- `contract-types`: loai hop dong
- `purchases`: don mua hang va hoa don mua
- `purchase-term`: don mua theo ky han
- `banking`: sao ke va doi soat ngan hang
- `bank-accounts`: tai khoan ngan hang
- `bank-import-templates`: template import ngan hang
- `products`: san pham
- `supplierLocations`: kho/diem nhan hang
- `price-bulletins`: bang gia
- `platts-prices`: gia Platts
- `rbac`: vai tro va phan quyen
- `cron`: cong viec dinh ky

## 14. Huong dan dung Git theo kieu team

Khi lam viec nhom, muc tieu la moi thay doi deu ro nguon goc, de review va khong lam anh huong cong viec cua nguoi khac.

### 14.1. Nguyen tac chung

- Khong commit truc tiep vao branch chinh nhu `main`, `master`, `develop`.
- Moi task nen co mot branch rieng.
- Truoc khi bat dau task moi, luon cap nhat code moi nhat tu branch goc.
- Commit nen nho, tap trung vao mot y nghia ro rang.
- Khong commit file moi truong local nhu `.env`.
- Khong commit code debug tam thoi, log thua, file build hoac file sinh ra ngoai y muon.
- Neu thay doi file dang co sua doi cua nguoi khac, can doc ky diff truoc khi sua tiep.

### 14.2. Quy uoc dat ten branch

Nen dat branch theo dang:

```text
<type>/<short-description>
```

Mot so `type` thong dung:

- `feature`: them chuc nang moi
- `fix`: sua loi
- `hotfix`: sua loi gap
- `refactor`: cai thien code nhung khong doi hanh vi
- `docs`: cap nhat tai lieu
- `chore`: viec phu tro nhu config, dependency, format

Vi du:

```bash
git checkout -b feature/customer-import
git checkout -b fix/login-session-expired
git checkout -b docs/project-guide
```

### 14.3. Bat dau mot task moi

Neu team dung branch goc la `develop`:

```bash
git checkout develop
git pull --rebase origin develop
git checkout -b feature/my-task
```

Neu team dung branch goc la `main`:

```bash
git checkout main
git pull --rebase origin main
git checkout -b feature/my-task
```

Dung `pull --rebase` de lich su commit gon hon khi lay code moi tu remote.

### 14.4. Kiem tra thay doi truoc khi commit

Xem file dang thay doi:

```bash
git status
```

Xem noi dung thay doi:

```bash
git diff
```

Xem thay doi da dua vao stage:

```bash
git diff --staged
```

Chi stage cac file lien quan den task:

```bash
git add src/features/customers/api.ts
git add src/features/customers/hooks.ts
```

Neu muon stage tung phan nho trong file:

```bash
git add -p
```

### 14.5. Quy uoc commit message

Nen viet commit message ngan gon, ro hanh dong:

```text
<type>: <noi dung thay doi>
```

Vi du:

```bash
git commit -m "feature: add customer import review table"
git commit -m "fix: handle expired session redirect"
git commit -m "docs: add project onboarding guide"
```

Mot commit tot nen tra loi duoc cau hoi: thay doi gi va vi sao can thay doi.

### 14.6. Cap nhat branch khi dang lam

Neu branch goc co code moi, cap nhat branch hien tai bang rebase:

```bash
git fetch origin
git rebase origin/develop
```

Hoac neu branch goc la `main`:

```bash
git fetch origin
git rebase origin/main
```

Sau khi rebase, neu branch da push len remote truoc do, can push lai bang:

```bash
git push --force-with-lease
```

Chi dung `--force-with-lease`, khong dung `--force`, vi `--force-with-lease` giup tranh ghi de commit moi cua nguoi khac tren remote.

### 14.7. Xu ly conflict

Khi gap conflict:

1. Chay `git status` de xem file bi conflict.
2. Mo tung file va tim cac marker:

```text
code tu branch dang merge/rebase
```

3. Chon phan dung, sua lai file thanh code hop le.
4. Chay test/lint lien quan neu co.
5. Stage file da sua:

```bash
git add path/to/file.ts
```

6. Tiep tuc rebase:

```bash
git rebase --continue
```

Neu dang merge thi dung:

```bash
git commit
```

Neu conflict qua phuc tap, nen trao doi voi nguoi dang sua cung khu vuc code truoc khi quyet dinh.

### 14.8. Push branch va tao Pull Request

Push branch len remote:

```bash
git push -u origin feature/my-task
```

Khi tao Pull Request, nen co:

- Mo ta ngan gon thay doi.
- Link task/ticket neu co.
- Anh chup man hinh hoac video neu thay doi UI.
- Cac buoc da test.
- Ghi chu rui ro neu thay doi cham vao module lon.

Truoc khi mo PR, nen chay:

```bash
npm run lint
npm run build
```

Neu khong chay duoc lenh nao, ghi ro ly do trong PR.

### 14.9. Review code

Nguoi tao PR nen:

- Tu review diff cua minh truoc.
- Xoa code thua, comment tam, log debug.
- Dam bao PR chi gom thay doi lien quan den task.
- Tra loi comment review bang cach sua code hoac giai thich ly do ky thuat.

Nguoi review nen tap trung vao:

- Loi logic, loi du lieu, loi phan quyen.
- Rui ro anh huong module khac.
- Thieu invalidate query hoac xu ly loading/error.
- Thieu test thu cong cho luong quan trong.
- Code kho bao tri hoac khong theo pattern hien co.

### 14.10. Sau khi PR duoc merge

Quay ve branch goc va cap nhat code:

```bash
git checkout develop
git pull --rebase origin develop
```

Xoa branch local da merge:

```bash
git branch -d feature/my-task
```

Xoa branch remote neu team khong tu dong xoa:

```bash
git push origin --delete feature/my-task
```

### 14.11. Cac lenh huu ich

Xem lich su ngan gon:

```bash
git log --oneline --decorate --graph --all
```

Xem file nao thay doi trong commit gan nhat:

```bash
git show --stat
```

Tam cat thay doi chua commit de doi branch:

```bash
git stash push -m "wip my task"
git stash pop
```

Huy thay doi o file chua stage:

```bash
git restore path/to/file.ts
```

Bo file khoi stage nhung giu noi dung thay doi:

```bash
git restore --staged path/to/file.ts
```

Luu y: chi dung cac lenh huy thay doi khi chac chan do la thay doi cua minh va khong can giu lai.

## 15. Checklist cho nguoi moi

Truoc khi bat dau task dau tien:

- Chay duoc `npm install`.
- Tao dung file `.env`.
- Chay duoc `npm run dev`.
- Dang nhap duoc vao ung dung local.
- Doc qua `src/app/router.tsx` de nam cac route chinh.
- Doc qua `src/config/routes.ts` de nam endpoint API.
- Doc mot module mau, nen bat dau voi `customers` hoac `products`.
- Nam quy trinh Git cua team: tao branch rieng, commit ro rang, mo PR de review.
- Chay `npm run lint` truoc khi ban giao thay doi.
