test.todo('setupUser calls cleanUpUsers')
test.todo('setupUser calls setUserTime')

test.todo('updateUserTime throws if no auth')
test.todo('updateUserTime calls setUserTime')

test.todo('registerToken throws if no uid')
test.todo('registerToken throws if no token')
test.todo('registerToken throws if no user record')
test.todo('registerToken sets users/$user/clients/$token')
test.todo('registerToken throws if set fail')
test.todo('registerToken calls pushClientLoad')

test.todo('reloadClient throws if no auth')
test.todo('reloadClient throws if no clients')
test.todo('reloadClient calls pushClientReload for each client')
