

const dbUrl = "https://riskops-75637-default-rtdb.firebaseio.com/users.json";

async function deleteUser() {
    try {
        console.log("Fetching users...");
        const res = await fetch(dbUrl);
        const users = await res.json();
        
        if (!users) {
            console.log("No users found.");
            return;
        }

        let targetId = null;
        for (const [id, user] of Object.entries(users)) {
            if (user.email && user.email.toLowerCase().includes('camilo.espinosa')) {
                targetId = id;
                console.log(`Found user: ${user.name} (${user.email}) with ID: ${id}`);
                break;
            }
        }

        if (targetId) {
            console.log(`Deleting user ${targetId}...`);
            const deleteRes = await fetch(`https://riskops-75637-default-rtdb.firebaseio.com/users/${targetId}.json`, {
                method: 'DELETE'
            });
            
            if (deleteRes.ok) {
                console.log("User successfully deleted from Realtime Database.");
            } else {
                console.error("Failed to delete user:", await deleteRes.text());
            }
        } else {
            console.log("User camilo.espinosa not found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

deleteUser();
