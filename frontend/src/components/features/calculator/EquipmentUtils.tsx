import { Item } from '@/app/types/calculator';
import { AttackStyleDefinition } from './AttackStyleSelector';

// Get available attack styles from weapon's combat_styles data
export function getWeaponAttackStyles(weapon: Item | null): Record<string, AttackStyleDefinition> {
  if (!weapon || !weapon.combat_stats?.combat_styles) return {};

  // Parse combat styles from the weapon data
  try {
    const styles: Record<string, AttackStyleDefinition> = {};
    
    // Format can be complex, handle both array and object formats
    const combatStyles = weapon.combat_stats.combat_styles;
    
    // Skip header row if it exists (common in the data)
    const startIdx = Array.isArray(combatStyles) &&
                    combatStyles[0]?.name === "Attack type" ? 1 : 0;
    
    // Process each style
    if (Array.isArray(combatStyles)) {
      for (let i = startIdx; i < combatStyles.length; i++) {
        const style = combatStyles[i];
        if (!style || !style.name) continue;

        const styleName = style.name.toLowerCase();
        let attackType = style.attack_type?.toLowerCase() || "";

        const bonuses = weapon.combat_stats.attack_bonuses || {};

        // If declared attackType is missing or ≤ 0, try to infer a better one
        const bonusMap: Record<string, number> = {
          stab: bonuses.stab ?? -999,
          slash: bonuses.slash ?? -999,
          crush: bonuses.crush ?? -999
        };

        const hasValidBonus = Object.values(bonusMap).some((val) => val > 0);
        // Check if attackType is a valid key and has a positive bonus
        const validAttackTypes = ['stab', 'slash', 'crush'];
        if (!validAttackTypes.includes(attackType) || !(attackType in bonusMap) || bonusMap[attackType as keyof typeof bonusMap] <= 0) {
          // Find first attack type with a positive bonus
          const fallback = Object.entries(bonusMap).find(([type, val]) => val > 0);
          if (fallback) {
            attackType = fallback[0]; // Replace bad attackType
          } else {
            // If no positive bonus found, default to the highest one (even if negative)
            const highestBonus = Object.entries(bonusMap).sort((a, b) => b[1] - a[1])[0];
            attackType = highestBonus ? highestBonus[0] : 'slash';
          }
        }
        
        if (!hasValidBonus) {
          // Find first attack type with a positive bonus
          const fallback = Object.entries(bonusMap).find(([type, val]) => val > 0);
          if (!fallback) {
            console.warn(`[Filtered] Skipping ${style.name}: no valid attack type bonuses`);
            continue;
          }
          attackType = fallback[0]; // Replace bad attackType
        }

        const boostDesc = style.boost || "";
        const isControlled = boostDesc.includes("+1 to all");
        const styleAttackBonus = isControlled ? 1 : (boostDesc.includes("+3 Attack") ? 3 : 0);
        const styleStrengthBonus = isControlled ? 1 : (boostDesc.includes("+3 Strength") ? 3 : 0);
        const styleDefenceBonus = isControlled ? 1 : (boostDesc.includes("+3 Defence") ? 3 : 0);

        styles[styleName] = {
          name: style.name,
          attackType,
          bonus: {
            attack: styleAttackBonus,
            strength: styleStrengthBonus,
            defence: styleDefenceBonus
          },
          description: boostDesc
        };
      }
    }
    
    return styles;
  } catch (error) {
    console.error("Failed to parse weapon combat styles:", error);
    return {};
  }
}