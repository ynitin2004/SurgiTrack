const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const auth = require('../controllers/authController');
const stats = require('../controllers/statsController');
const surgeries = require('../controllers/surgeryController');
const surgeons = require('../controllers/surgeonController');
const me = require('../controllers/meController');
const admin = require('../controllers/adminController');

const router = Router();
const adminOnly = [requireAuth, requireRole('admin')];
const surgeonOnly = [requireAuth, requireRole('surgeon')];

// public
router.post('/auth/login', auth.login);
router.post('/auth/register', auth.register);

// any logged-in user
router.get('/auth/me', requireAuth, auth.me);
router.get('/surgeries', requireAuth, surgeries.list); // surgeons: own cases, or a same-hospital teammate's

// admin
router.get('/stats/summary', adminOnly, stats.summary);
router.get('/surgeries/filters', adminOnly, surgeries.filters);
router.get('/surgeons', adminOnly, surgeons.list);
router.get('/surgeons/:id', adminOnly, surgeons.detail);
router.get('/surgeons/:id/report/periods', adminOnly, surgeons.reportPeriods);
router.get('/surgeons/:id/report', adminOnly, surgeons.getReport);
router.get('/admin/counts', adminOnly, admin.counts);
router.get('/admin/users', adminOnly, admin.listUsers);
router.post('/admin/users', adminOnly, admin.createUser);
router.patch('/admin/users/:id', adminOnly, admin.updateUser);
router.get('/admin/redemptions', adminOnly, admin.listRedemptions);
router.patch('/admin/redemptions/:id', adminOnly, admin.updateRedemption);

// surgeon portal
router.get('/me/profile', surgeonOnly, me.profile);
router.get('/me/rewards', surgeonOnly, me.getRewards);
router.get('/me/instrument-options', surgeonOnly, me.instrumentOptions);
router.post('/me/rewards/redeem', surgeonOnly, me.redeem);
router.get('/me/team', surgeonOnly, me.getTeam);
router.get('/me/team/:id', surgeonOnly, me.teamMember);
router.get('/me/inventory/new', surgeonOnly, me.newInventory);
router.get('/me/report/periods', surgeonOnly, me.reportPeriods);
router.get('/me/report', surgeonOnly, me.getReport);
router.get('/me/team/:id/report/periods', surgeonOnly, me.reportPeriods);
router.get('/me/team/:id/report', surgeonOnly, me.getReport);

router.use((req, res) => res.status(404).json({ message: 'Not found' }));

module.exports = router;
