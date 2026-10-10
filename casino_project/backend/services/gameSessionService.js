const netResult = winAmount - cost; 

const user =
    await User.findByIdAndUpdate(
        {
            _id: userId,
            balance: { $gte: cost },

        },
    
    {
        $inc: { balance: netResult },
    },
    {
        new: true,
        runValidators: true,
    }
    );