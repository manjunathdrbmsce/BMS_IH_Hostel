"use strict";
// =============================================================================
// BMS Hostel Platform - Database Seed Script
// Seeds roles, permissions, role-permission mappings, and super admin user
// =============================================================================
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------
var ROLES = [
    { name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'Institution-level administrator with full access', isSystem: true },
    { name: 'HOSTEL_ADMIN', displayName: 'Hostel Admin', description: 'Hostel-level administrator', isSystem: true },
    { name: 'WARDEN', displayName: 'Warden', description: 'Hostel warden responsible for student welfare', isSystem: true },
    { name: 'DEPUTY_WARDEN', displayName: 'Deputy Warden', description: 'Deputy warden / Resident tutor', isSystem: true },
    { name: 'ACCOUNTS_OFFICER', displayName: 'Accounts Officer', description: 'Finance and accounts management', isSystem: true },
    { name: 'MESS_MANAGER', displayName: 'Mess Manager', description: 'Mess operations manager', isSystem: true },
    { name: 'MESS_STAFF', displayName: 'Mess Staff', description: 'Mess counter staff for meal scanning', isSystem: true },
    { name: 'SECURITY_GUARD', displayName: 'Security Guard', description: 'Gate security and visitor management', isSystem: true },
    { name: 'MAINTENANCE_STAFF', displayName: 'Maintenance Staff', description: 'Housekeeping and maintenance', isSystem: true },
    { name: 'STUDENT', displayName: 'Student', description: 'Hostel resident student', isSystem: true },
    { name: 'PARENT', displayName: 'Parent / Guardian', description: 'Parent or guardian of a student', isSystem: true },
];
// ---------------------------------------------------------------------------
// Permission definitions
// ---------------------------------------------------------------------------
var PERMISSIONS = [
    // Users
    { name: 'USER_CREATE', module: 'users', description: 'Create new users' },
    { name: 'USER_READ', module: 'users', description: 'View user details' },
    { name: 'USER_UPDATE', module: 'users', description: 'Update user details' },
    { name: 'USER_DELETE', module: 'users', description: 'Deactivate/delete users' },
    { name: 'USER_LIST', module: 'users', description: 'List all users' },
    // Roles
    { name: 'ROLE_ASSIGN', module: 'roles', description: 'Assign roles to users' },
    { name: 'ROLE_REVOKE', module: 'roles', description: 'Revoke roles from users' },
    // Hostel
    { name: 'HOSTEL_MANAGE', module: 'hostel', description: 'Manage hostel inventory' },
    { name: 'ROOM_MANAGE', module: 'hostel', description: 'Manage rooms and beds' },
    { name: 'ALLOTMENT_MANAGE', module: 'allotment', description: 'Manage room allotments' },
    // Finance
    { name: 'FINANCE_MANAGE', module: 'finance', description: 'Manage fees and payments' },
    { name: 'PAYMENT_VIEW', module: 'finance', description: 'View payment records' },
    // Gate
    { name: 'GATE_OPERATE', module: 'gate', description: 'Operate gate entry/exit' },
    { name: 'LEAVE_APPROVE', module: 'gate', description: 'Approve leave requests' },
    // Mess
    { name: 'MESS_MANAGE', module: 'mess', description: 'Manage mess operations' },
    { name: 'MESS_SCAN', module: 'mess', description: 'Scan meals at counter' },
    // Complaints
    { name: 'COMPLAINT_MANAGE', module: 'complaints', description: 'Manage complaints' },
    // Notices
    { name: 'NOTICE_PUBLISH', module: 'notices', description: 'Publish notices' },
    // Reports
    { name: 'REPORT_VIEW', module: 'reports', description: 'View reports and dashboards' },
    // Audit
    { name: 'AUDIT_VIEW', module: 'audit', description: 'View audit logs' },
];
// ---------------------------------------------------------------------------
// Role -> Permission mappings
// ---------------------------------------------------------------------------
var ROLE_PERMISSIONS = {
    SUPER_ADMIN: PERMISSIONS.map(function (p) { return p.name; }), // Full access
    HOSTEL_ADMIN: [
        'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_LIST',
        'ROLE_ASSIGN', 'ROLE_REVOKE',
        'HOSTEL_MANAGE', 'ROOM_MANAGE', 'ALLOTMENT_MANAGE',
        'FINANCE_MANAGE', 'PAYMENT_VIEW',
        'LEAVE_APPROVE',
        'MESS_MANAGE',
        'COMPLAINT_MANAGE',
        'NOTICE_PUBLISH',
        'REPORT_VIEW',
        'AUDIT_VIEW',
    ],
    WARDEN: [
        'USER_READ', 'USER_LIST',
        'ROOM_MANAGE', 'ALLOTMENT_MANAGE',
        'PAYMENT_VIEW',
        'LEAVE_APPROVE',
        'GATE_OPERATE',
        'COMPLAINT_MANAGE',
        'NOTICE_PUBLISH',
        'REPORT_VIEW',
    ],
    DEPUTY_WARDEN: [
        'USER_READ', 'USER_LIST',
        'LEAVE_APPROVE',
        'GATE_OPERATE',
        'COMPLAINT_MANAGE',
        'NOTICE_PUBLISH',
    ],
    ACCOUNTS_OFFICER: [
        'USER_READ', 'USER_LIST',
        'FINANCE_MANAGE', 'PAYMENT_VIEW',
        'REPORT_VIEW',
    ],
    MESS_MANAGER: [
        'USER_READ',
        'MESS_MANAGE', 'MESS_SCAN',
        'REPORT_VIEW',
    ],
    MESS_STAFF: [
        'MESS_SCAN',
    ],
    SECURITY_GUARD: [
        'GATE_OPERATE',
        'USER_READ',
    ],
    MAINTENANCE_STAFF: [
        'COMPLAINT_MANAGE',
    ],
    STUDENT: [
        'PAYMENT_VIEW',
    ],
    PARENT: [
        'PAYMENT_VIEW',
    ],
};
// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var roleMap, _i, ROLES_1, role, created, permissionMap, _a, PERMISSIONS_1, perm, created, rpCount, _b, _c, _d, roleName, permNames, roleId, _e, permNames_1, permName, permissionId, adminEmail, adminPassword, adminFirstName, adminLastName, passwordHash, admin, superAdminRoleId, existingRole;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log('🌱 Starting seed...');
                    // 1. Upsert roles
                    console.log('  Creating roles...');
                    roleMap = {};
                    _i = 0, ROLES_1 = ROLES;
                    _f.label = 1;
                case 1:
                    if (!(_i < ROLES_1.length)) return [3 /*break*/, 4];
                    role = ROLES_1[_i];
                    return [4 /*yield*/, prisma.role.upsert({
                            where: { name: role.name },
                            update: { displayName: role.displayName, description: role.description },
                            create: role,
                        })];
                case 2:
                    created = _f.sent();
                    roleMap[created.name] = created.id;
                    _f.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("  \u2713 ".concat(ROLES.length, " roles created/updated"));
                    // 2. Upsert permissions
                    console.log('  Creating permissions...');
                    permissionMap = {};
                    _a = 0, PERMISSIONS_1 = PERMISSIONS;
                    _f.label = 5;
                case 5:
                    if (!(_a < PERMISSIONS_1.length)) return [3 /*break*/, 8];
                    perm = PERMISSIONS_1[_a];
                    return [4 /*yield*/, prisma.permission.upsert({
                            where: { name: perm.name },
                            update: { module: perm.module, description: perm.description },
                            create: perm,
                        })];
                case 6:
                    created = _f.sent();
                    permissionMap[created.name] = created.id;
                    _f.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log("  \u2713 ".concat(PERMISSIONS.length, " permissions created/updated"));
                    // 3. Assign permissions to roles
                    console.log('  Assigning permissions to roles...');
                    rpCount = 0;
                    _b = 0, _c = Object.entries(ROLE_PERMISSIONS);
                    _f.label = 9;
                case 9:
                    if (!(_b < _c.length)) return [3 /*break*/, 14];
                    _d = _c[_b], roleName = _d[0], permNames = _d[1];
                    roleId = roleMap[roleName];
                    if (!roleId)
                        return [3 /*break*/, 13];
                    _e = 0, permNames_1 = permNames;
                    _f.label = 10;
                case 10:
                    if (!(_e < permNames_1.length)) return [3 /*break*/, 13];
                    permName = permNames_1[_e];
                    permissionId = permissionMap[permName];
                    if (!permissionId)
                        return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.rolePermission.upsert({
                            where: {
                                roleId_permissionId: { roleId: roleId, permissionId: permissionId },
                            },
                            update: {},
                            create: { roleId: roleId, permissionId: permissionId },
                        })];
                case 11:
                    _f.sent();
                    rpCount++;
                    _f.label = 12;
                case 12:
                    _e++;
                    return [3 /*break*/, 10];
                case 13:
                    _b++;
                    return [3 /*break*/, 9];
                case 14:
                    console.log("  \u2713 ".concat(rpCount, " role-permission mappings created/updated"));
                    // 4. Create super admin user
                    console.log('  Creating super admin user...');
                    adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@bms.local';
                    adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
                    adminFirstName = process.env.SEED_ADMIN_FIRST_NAME || 'Super';
                    adminLastName = process.env.SEED_ADMIN_LAST_NAME || 'Admin';
                    return [4 /*yield*/, bcrypt.hash(adminPassword, 12)];
                case 15:
                    passwordHash = _f.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: adminEmail },
                            update: {
                                firstName: adminFirstName,
                                lastName: adminLastName,
                                passwordHash: passwordHash,
                            },
                            create: {
                                email: adminEmail,
                                firstName: adminFirstName,
                                lastName: adminLastName,
                                passwordHash: passwordHash,
                                status: client_1.UserStatus.ACTIVE,
                            },
                        })];
                case 16:
                    admin = _f.sent();
                    superAdminRoleId = roleMap['SUPER_ADMIN'];
                    if (!superAdminRoleId) return [3 /*break*/, 19];
                    return [4 /*yield*/, prisma.userRole.findFirst({
                            where: {
                                userId: admin.id,
                                roleId: superAdminRoleId,
                                revokedAt: null,
                            },
                        })];
                case 17:
                    existingRole = _f.sent();
                    if (!!existingRole) return [3 /*break*/, 19];
                    return [4 /*yield*/, prisma.userRole.create({
                            data: {
                                userId: admin.id,
                                roleId: superAdminRoleId,
                            },
                        })];
                case 18:
                    _f.sent();
                    _f.label = 19;
                case 19:
                    console.log("  \u2713 Super admin created: ".concat(adminEmail));
                    console.log('✅ Seed completed successfully');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
//# sourceMappingURL=seed.js.map