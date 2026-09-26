import Company from '../modals/Company.js';

function parseRiderIdentifier(idInput, nameInput, combinedInput) {
  let riderId = (idInput || '').toString().trim();
  let riderName = (nameInput || '').toString().trim();
  let riderCombined = (combinedInput || '').toString().trim();

  // Strip leading/trailing punctuation/spaces
  riderId = riderId.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
  riderName = riderName.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
  riderCombined = riderCombined.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();

  // If riderId and riderName are already distinct and non-empty
  if (riderId && riderName && !/^\d+$/.test(riderName)) {
    if (!riderCombined) {
      riderCombined = `${riderName} - ${riderId}`;
    }
    return { riderId, riderName, riderCombined };
  }

  // If riderId or riderName is missing, extract from combined or available field
  let raw = (riderCombined || riderName || riderId || '').toString().trim();
  raw = raw.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();

  if (raw) {
    // 1. Digits first, then name: "123456 - Vineet", "123456/Vineet", "123456 Vineet"
    let m = raw.match(/^(\d+)[\s\-_/:|]+(.+)$/);
    if (m) {
      if (!riderId) riderId = m[1].trim();
      if (!riderName) riderName = m[2].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
    } else {
      // 2. Name first, then digits: "Vineet Pancheshwar - 123456", "Vineet / 123456", "Shubham - 789"
      m = raw.match(/^(.+?)[\s\-_/:|]+(\d+)$/);
      if (m) {
        if (!riderId) riderId = m[2].trim();
        if (!riderName) riderName = m[1].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
      } else if (/^\d+$/.test(raw)) {
        if (!riderId) riderId = raw;
      } else {
        if (!riderName) riderName = raw;
      }
    }
  }

  // Clean individual id and name
  if (riderId) riderId = riderId.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
  if (riderName) riderName = riderName.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();

  // If riderName is only digits and riderId is empty, swap
  if (riderName && !riderId && /^\d+$/.test(riderName)) {
    riderId = riderName;
    riderName = '';
  }

  if (!riderCombined) {
    riderCombined = riderName && riderId ? `${riderName} - ${riderId}` : (riderName || riderId || '');
  }

  return { riderId, riderName, riderCombined };
}

const sanitizeRidersList = (riders) => {
  if (!Array.isArray(riders)) return [];
  return riders
    .filter((r) => r && (r.riderId || r.riderName || r.riderCombined))
    .map((r) => {
      const { riderId, riderName, riderCombined } = parseRiderIdentifier(r.riderId, r.riderName, r.riderCombined);
      return {
        riderId,
        riderName,
        riderCombined,
        rate: Number(r.rate !== undefined ? r.rate : (r.rateCard !== undefined ? r.rateCard : 0)) || 0,
        rateCard: Number(r.rateCard !== undefined ? r.rateCard : (r.rate !== undefined ? r.rate : 0)) || 0,
        primary: Number(r.primary) || 0,
        clubbed: Number(r.clubbed) || 0,
      };
    });
};

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
export const getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });

    const sanitizedCompanies = await Promise.all(
      companies.map(async (company) => {
        let changed = false;
        if (Array.isArray(company.riders) && company.riders.length > 0) {
          const cleaned = sanitizeRidersList(company.riders);
          for (let i = 0; i < cleaned.length; i++) {
            if (
              cleaned[i].riderId !== (company.riders[i]?.riderId || '') ||
              cleaned[i].riderName !== (company.riders[i]?.riderName || '')
            ) {
              changed = true;
              break;
            }
          }
          if (changed) {
            company.riders = cleaned;
            await company.save();
          }
        }
        return company;
      })
    );

    res.json({
      success: true,
      data: sanitizedCompanies,
    });
  } catch (error) {
    next(error);
  }
};

export const createCompany = async (req, res, next) => {
  try {
    const { name, code, status, icon, color, trackRiderDetails, sheetType, riders } = req.body;

    const trimmedName = name.trim();
    const existingName = await Company.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existingName) {
      res.status(400);
      throw new Error(`Company '${existingName.name}' already exists.`);
    }

    const companyCode = (code || `COMP-${Date.now().toString().slice(-4)}`).toUpperCase().trim();

    const existingCode = await Company.findOne({ code: companyCode });
    if (existingCode) {
      res.status(400);
      throw new Error(`Company code '${companyCode}' already exists.`);
    }

    const cleanRiders = sanitizeRidersList(riders);

    const company = await Company.create({
      name: name.trim(),
      code: companyCode,
      status: status || 'Active',
      icon: icon || 'Building2',
      color: color || '#E53935',
      trackRiderDetails: trackRiderDetails !== undefined ? Boolean(trackRiderDetails) : true,
      sheetType: sheetType || 'shadowfax',
      riders: cleanRiders,
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private
export const updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      res.status(404);
      throw new Error('Company not found.');
    }

    if (req.body.name) company.name = req.body.name.trim();
    if (req.body.code) company.code = req.body.code.toUpperCase().trim();
    if (req.body.status) company.status = req.body.status;
    if (req.body.icon) company.icon = req.body.icon;
    if (req.body.color) company.color = req.body.color;
    if (req.body.trackRiderDetails !== undefined) {
      company.trackRiderDetails = Boolean(req.body.trackRiderDetails);
    }
    if (req.body.sheetType) company.sheetType = req.body.sheetType;
    if (req.body.riders !== undefined && Array.isArray(req.body.riders)) {
      company.riders = sanitizeRidersList(req.body.riders);
    }

    const updated = await company.save();

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle company status (Active <-> Inactive)
// @route   PATCH /api/companies/:id/toggle-status
// @access  Private
export const toggleCompanyStatus = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      res.status(404);
      throw new Error('Company not found.');
    }

    company.status = company.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await company.save();

    res.json({
      success: true,
      message: `Company status changed to ${updated.status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private
export const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      res.status(404);
      throw new Error('Company not found.');
    }

    await Company.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Company '${company.name}' deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete companies
// @route   POST /api/companies/bulk-delete
// @access  Private
export const bulkDeleteCompanies = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of company IDs to delete.');
    }

    const result = await Company.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} company records successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

