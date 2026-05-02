const ROLE_ALIASES = {
    admin: ["admin", "university_admin"],
    university_admin: ["university_admin", "admin"],
    college_admin: ["college_admin"]
};

module.exports = (...roles) => {
    return (req, res, next) => {
        const allowedRoles = new Set();
        roles.forEach((role) => {
            const aliases = ROLE_ALIASES[role];
            if (aliases) {
                aliases.forEach((alias) => allowedRoles.add(alias));
            } else {
                allowedRoles.add(role);
            }
        });

        if (!allowedRoles.has(req.user.role)) {
            return res.status(403).json({ message: "Access forbidden" });
        }

        next();
    };
};
