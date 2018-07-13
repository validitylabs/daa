/**
 * @title DAO Token 
 * @notice This contract stores token of the DAO
 * @dev 
 */
pragma solidity ^0.4.21;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/StandardBurnableToken.sol";

contract DAOToken is StandardBurnableToken, MintableToken {
    
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public cap;

    /**
     *@notice Create The DAO token
     *@param _name The name of the token
     *@param _symbol The symbol of the token
     *@param _cap The cap of the token, can also without cap (if cap=0)
     */
    constructor (string _name, string _symbol, uint256 _cap) public {
        name = _name;
        symbol = _symbol;
        cap = _cap;
    }

    /**
    * @dev Function to mint tokens
    * @param _to The address that will receive the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
        require(cap == 0 || (cap > 0 && totalSupply_.add(_amount) <= cap));

        return super.mint(_to, _amount);
    }

}