const mongoose = require('mongoose');
const User = require('../models/User');
const cartService = require('../services/cartService');

async function validOwner(req, res) {
  // Signed tokens with an invalid subject or a deleted account are not enough.
  const id = req.user?.id;
  if (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id) ||
      !await User.exists({ _id: id })) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return false;
  }
  return true;
}

async function getCart(req, res) {
  if (!await validOwner(req, res)) return;
  res.json(await cartService.getCart(req.user.id));
}

async function updateCart(req, res) {
  if (!await validOwner(req, res)) return;
  // PUT replaces the full cart; { items: [] } explicitly clears it.
  res.json(await cartService.writeCart(req.user.id, req.body?.items, false));
}

async function mergeCart(req, res) {
  if (!await validOwner(req, res)) return;
  res.json(await cartService.writeCart(req.user.id, req.body?.items, true));
}

module.exports = { getCart, updateCart, mergeCart };
