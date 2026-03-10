import Creator from '../creators/creator.model.js'
import User from '../users/user.model.js'

// GET /api/auth/me
// Returns both creator and vendor profileIds so the same account can hold both roles.
export const getCurrentUser = async (req, res) => {
  try {
    const { uid } = req.user

    const [creator, vendor] = await Promise.all([
      Creator.findOne({ uid }),
      User.findOne({ uid }),
    ])

    const creatorProfileId = creator ? creator._id.toString() : null
    const vendorProfileId  = vendor  ? vendor._id.toString()  : null

    // Default active role: creator if exists, else vendor, else null
    let role = null
    let profileId = null
    if (creator) { role = 'creator'; profileId = creatorProfileId }
    else if (vendor) { role = 'vendor'; profileId = vendorProfileId }

    return res.json({
      success: true,
      data: {
        role,
        profileCompleted: !!role,
        profileId,
        creatorProfileId,
        vendorProfileId,
      },
    })
  } catch (error) {
    console.error('AUTH /me error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch user info' })
  }
}
